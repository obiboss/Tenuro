import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_DEVELOPER_ALLOCATION_LETTER_TEMPLATE,
  DEFAULT_DEVELOPER_SALES_AGREEMENT_TEMPLATE,
  type DeveloperEditableTemplateType,
} from "@/constants/developer-document-templates";
import { AppError } from "@/server/errors/app-error";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperDocumentTemplateByType } from "@/server/repositories/developer-document-templates.repository";
import {
  getActiveDeveloperPaymentPlanForSale,
  listDeveloperPaymentScheduleItemsForSale,
} from "@/server/repositories/developer-payment-plans.repository";
import { listDeveloperSalePaymentsForSale } from "@/server/repositories/developer-sale-payments.repository";
import {
  getDeveloperSaleById,
  type DeveloperSaleWithDetails,
} from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { formatNaira } from "@/server/utils/money";

type PlaceholderValueMap = Record<string, string>;

export type DeveloperDocumentMissingField = {
  placeholder: string;
  label: string;
};

export type DeveloperDocumentAutofillPreview = {
  sale: DeveloperSaleWithDetails;
  templateType: DeveloperEditableTemplateType;
  templateBody: string;
  renderedBody: string;
  values: PlaceholderValueMap;
  missingFields: DeveloperDocumentMissingField[];
  unresolvedPlaceholders: string[];
};

const PLACEHOLDER_PATTERN = /\{\{[a-zA-Z0-9_]+\}\}/g;

const PLACEHOLDER_LABELS: Record<string, string> = {
  "{{developer_company_name}}": "Developer company name",
  "{{developer_office_address}}": "Developer office address",
  "{{developer_company_phone}}": "Developer phone number",
  "{{developer_company_email}}": "Developer email address",
  "{{authorized_representative_name}}": "Authorized representative name",
  "{{authorized_representative_designation}}":
    "Authorized representative designation",
  "{{buyer_full_name}}": "Buyer full name",
  "{{buyer_phone_number}}": "Buyer phone number",
  "{{buyer_email}}": "Buyer email address",
  "{{buyer_address}}": "Buyer residential address",
  "{{estate_name}}": "Estate name",
  "{{estate_location}}": "Estate location",
  "{{estate_city}}": "Estate city",
  "{{estate_lga}}": "Estate LGA",
  "{{estate_state}}": "Estate state",
  "{{plot_number}}": "Plot number",
  "{{plot_size}}": "Plot size",
  "{{plot_use}}": "Plot use",
  "{{title_description}}": "Title description",
  "{{survey_plan_reference}}": "Survey plan reference",
  "{{sale_reference}}": "Sale reference",
  "{{total_price_locked}}": "Locked sale price",
  "{{total_price_locked_words}}": "Locked sale price in words",
  "{{initial_deposit_amount}}": "Initial deposit amount",
  "{{amount_paid}}": "Amount paid",
  "{{outstanding_balance}}": "Outstanding balance",
  "{{payment_plan_mode}}": "Payment plan mode",
  "{{sale_date}}": "Sale date",
  "{{expected_completion_date}}": "Expected completion date",
  "{{agreement_date}}": "Agreement date",
  "{{allocation_date}}": "Allocation date",
};

function normaliseText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : "";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatPaymentMode(value: string) {
  return value.replaceAll("_", " ");
}

function numberToWords(value: number): string {
  const safeValue = Math.floor(Math.abs(value));

  if (safeValue === 0) {
    return "zero";
  }

  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];

  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  function belowThousand(amount: number): string {
    const parts: string[] = [];
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;

    if (hundreds > 0) {
      parts.push(`${ones[hundreds]} hundred`);
    }

    if (remainder > 0) {
      if (remainder < 20) {
        parts.push(ones[remainder]);
      } else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;
        parts.push(one > 0 ? `${tens[ten]}-${ones[one]}` : tens[ten]);
      }
    }

    return parts.join(" and ");
  }

  const scales = [
    { value: 1_000_000_000, label: "billion" },
    { value: 1_000_000, label: "million" },
    { value: 1_000, label: "thousand" },
  ];

  let remainder = safeValue;
  const parts: string[] = [];

  for (const scale of scales) {
    const chunk = Math.floor(remainder / scale.value);

    if (chunk > 0) {
      parts.push(`${belowThousand(chunk)} ${scale.label}`);
      remainder %= scale.value;
    }
  }

  if (remainder > 0) {
    parts.push(belowThousand(remainder));
  }

  return parts.join(", ");
}

function formatNairaWords(value: number) {
  return `${numberToWords(value)} naira only`;
}

function getDefaultTemplateBody(templateType: DeveloperEditableTemplateType) {
  if (templateType === "allocation_letter") {
    return DEFAULT_DEVELOPER_ALLOCATION_LETTER_TEMPLATE;
  }

  return DEFAULT_DEVELOPER_SALES_AGREEMENT_TEMPLATE;
}

function collectUnresolvedPlaceholders(renderedBody: string) {
  return Array.from(new Set(renderedBody.match(PLACEHOLDER_PATTERN) ?? []));
}

function renderTemplate(
  templateBody: string,
  values: PlaceholderValueMap,
): string {
  return templateBody.replace(PLACEHOLDER_PATTERN, (placeholder) => {
    const value = values[placeholder];

    return value && value.length > 0 ? value : placeholder;
  });
}

function collectMissingFields(
  templateBody: string,
  values: PlaceholderValueMap,
): DeveloperDocumentMissingField[] {
  const placeholders = Array.from(
    new Set(templateBody.match(PLACEHOLDER_PATTERN) ?? []),
  );

  return placeholders
    .filter((placeholder) => !values[placeholder])
    .map((placeholder) => ({
      placeholder,
      label: PLACEHOLDER_LABELS[placeholder] ?? placeholder,
    }));
}

function getLatestPaymentDate(
  payments: Awaited<ReturnType<typeof listDeveloperSalePaymentsForSale>>,
) {
  const postedPayments = payments.filter(
    (payment) => payment.status === "posted",
  );

  if (postedPayments.length === 0) {
    return null;
  }

  return postedPayments
    .map((payment) => payment.payment_date)
    .sort((first, second) => second.localeCompare(first))[0];
}

async function buildAutofillValues(params: {
  supabase: SupabaseClient;
  developerProfileId: string;
  developerAccountId: string;
  sale: DeveloperSaleWithDetails;
}) {
  const [paymentPlan, scheduleItems, payments] = await Promise.all([
    getActiveDeveloperPaymentPlanForSale(params.supabase, {
      developerAccountId: params.developerAccountId,
      saleId: params.sale.id,
    }),
    listDeveloperPaymentScheduleItemsForSale(params.supabase, {
      developerAccountId: params.developerAccountId,
      saleId: params.sale.id,
    }),
    listDeveloperSalePaymentsForSale(params.supabase, {
      developerAccountId: params.developerAccountId,
      saleId: params.sale.id,
    }),
  ]);

  const totalPaid = payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + Number(payment.amount_paid), 0);

  const outstandingBalance = Math.max(
    0,
    Number(params.sale.total_price_locked) - totalPaid,
  );

  const latestPaymentDate = getLatestPaymentDate(payments);
  const titleDescription =
    params.sale.developer_plots?.notes ??
    params.sale.developer_estates?.location ??
    "";

  const values: PlaceholderValueMap = {
    "{{developer_company_name}}": normaliseText(params.sale.notes) ? "" : "",
    "{{developer_office_address}}": "",
    "{{developer_company_phone}}": "",
    "{{developer_company_email}}": "",
    "{{authorized_representative_name}}": "",
    "{{authorized_representative_designation}}": "Authorized Representative",

    "{{buyer_full_name}}": normaliseText(
      params.sale.developer_buyers?.full_name,
    ),
    "{{buyer_phone_number}}": normaliseText(
      params.sale.developer_buyers?.phone_number,
    ),
    "{{buyer_email}}": normaliseText(params.sale.developer_buyers?.email),
    "{{buyer_address}}": normaliseText(
      params.sale.developer_buyers?.residential_address,
    ),

    "{{estate_name}}": normaliseText(
      params.sale.developer_estates?.estate_name,
    ),
    "{{estate_location}}": normaliseText(
      params.sale.developer_estates?.location,
    ),
    "{{estate_city}}": normaliseText(params.sale.developer_estates?.city),
    "{{estate_lga}}": normaliseText(params.sale.developer_estates?.lga),
    "{{estate_state}}": normaliseText(params.sale.developer_estates?.state),

    "{{plot_number}}": normaliseText(params.sale.developer_plots?.plot_number),
    "{{plot_size}}": normaliseText(params.sale.developer_plots?.size_label),
    "{{plot_use}}": "Residential",
    "{{title_description}}": normaliseText(titleDescription),
    "{{survey_plan_reference}}": "",

    "{{sale_reference}}": normaliseText(params.sale.sale_reference),
    "{{total_price_locked}}": formatNaira(
      Number(params.sale.total_price_locked),
    ),
    "{{total_price_locked_words}}": formatNairaWords(
      Number(params.sale.total_price_locked),
    ),
    "{{initial_deposit_amount}}": formatNaira(
      Number(params.sale.initial_deposit_amount),
    ),
    "{{amount_paid}}": formatNaira(totalPaid),
    "{{outstanding_balance}}": formatNaira(outstandingBalance),
    "{{payment_plan_mode}}": paymentPlan
      ? formatPaymentMode(paymentPlan.payment_plan_mode)
      : formatPaymentMode(params.sale.payment_plan_mode),

    "{{sale_date}}": formatDate(params.sale.sale_date),
    "{{expected_completion_date}}": formatDate(
      params.sale.expected_completion_date,
    ),
    "{{agreement_date}}": formatDate(new Date().toISOString()),
    "{{allocation_date}}": formatDate(
      latestPaymentDate ?? new Date().toISOString(),
    ),
  };

  return {
    values,
    paymentPlan,
    scheduleItems,
    payments,
    totalPaid,
    outstandingBalance,
  };
}

async function getDeveloperAccountOrThrow(params: {
  supabase: SupabaseClient;
  developerProfileId: string;
}) {
  const account = await getDeveloperAccountByOwnerProfileId(
    params.supabase,
    params.developerProfileId,
  );

  if (!account) {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_FOUND",
      "Developer account was not found.",
      404,
    );
  }

  return account;
}

export async function getDeveloperDocumentAutofillPreviewForCurrentDeveloper(params: {
  saleId: string;
  templateType: DeveloperEditableTemplateType;
  templateBody?: string | null;
}): Promise<DeveloperDocumentAutofillPreview> {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountOrThrow({
    supabase,
    developerProfileId: developer.id,
  });

  const sale = await getDeveloperSaleById(supabase, {
    developerAccountId: account.id,
    saleId: params.saleId,
  });

  if (!sale) {
    throw new AppError("DEVELOPER_SALE_NOT_FOUND", "Sale was not found.", 404);
  }

  const savedTemplate = await getDeveloperDocumentTemplateByType(supabase, {
    developerAccountId: account.id,
    templateType: params.templateType,
  });

  const templateBody =
    params.templateBody ??
    savedTemplate?.template_body ??
    getDefaultTemplateBody(params.templateType);

  const autofill = await buildAutofillValues({
    supabase,
    developerProfileId: developer.id,
    developerAccountId: account.id,
    sale,
  });

  const accountValues: PlaceholderValueMap = {
    "{{developer_company_name}}": normaliseText(account.company_name),
    "{{developer_office_address}}": normaliseText(account.office_address),
    "{{developer_company_phone}}": normaliseText(account.company_phone),
    "{{developer_company_email}}": normaliseText(account.company_email),
  };

  const values = {
    ...autofill.values,
    ...accountValues,
  };

  const renderedBody = renderTemplate(templateBody, values);

  return {
    sale,
    templateType: params.templateType,
    templateBody,
    renderedBody,
    values,
    missingFields: collectMissingFields(templateBody, values),
    unresolvedPlaceholders: collectUnresolvedPlaceholders(renderedBody),
  };
}

export function renderDeveloperDocumentTemplateForTest(params: {
  templateBody: string;
  values: PlaceholderValueMap;
}) {
  return {
    renderedBody: renderTemplate(params.templateBody, params.values),
    missingFields: collectMissingFields(params.templateBody, params.values),
  };
}
