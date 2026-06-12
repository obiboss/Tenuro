import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import {
  calculateDeveloperInstallmentFee,
  getDeveloperInstallmentFeePercentage,
} from "@/server/constants/developer-installment-fees";
import { getActiveBuyerSaleAccessTokenByHash } from "@/server/repositories/developer-buyer-sale-access-tokens.repository";
import { createDeveloperPaymentAllocations } from "@/server/repositories/developer-payment-allocations.repository";
import {
  createDeveloperPaymentIntent,
  getDeveloperPaymentIntentByIdempotencyKey,
  getDeveloperPaymentIntentByReference,
} from "@/server/repositories/developer-payment-intents.repository";
import {
  getActiveDeveloperPaymentPlanForSale,
  getDeveloperPaymentScheduleItemById,
} from "@/server/repositories/developer-payment-plans.repository";
import type { DeveloperPaymentScheduleItemRow } from "@/server/repositories/developer-payment-plans.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import { generateDeveloperPaymentReceiptSystem } from "@/server/services/developer-payment-receipts.service";
import {
  assertPaystackAmountMatchesExpected,
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { convertNairaToKobo } from "@/server/utils/money";

const PAYABLE_SCHEDULE_STATUSES = new Set(["pending", "part_paid", "overdue"]);

type OutstandingScheduleGateRow = {
  id: string;
  label: string;
  due_date: string | null;
  expected_amount: number | string;
  amount_paid: number | string;
  status: string;
};

function getAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!configuredUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "Application URL is not configured.",
      500,
    );
  }

  return configuredUrl.replace(/\/$/, "");
}

function createDeveloperPaymentReference() {
  return `BPD-${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`;
}

function hashBuyerPortalToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createIdempotencyKey(params: {
  saleId: string;
  scheduleItemId: string | null;
  amount: number;
  scope?: string | null;
}) {
  return [
    "developer-payment-request",
    params.scope?.trim() || "standard",
    params.saleId,
    params.scheduleItemId ?? "custom",
    params.amount.toFixed(2),
  ].join(":");
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      "DEVELOPER_PAYMENT_AMOUNT_INVALID",
      "Payment amount is not valid.",
      400,
    );
  }
}

function getScheduleOutstandingAmount(item: DeveloperPaymentScheduleItemRow) {
  return Number(
    Math.max(
      0,
      Number(item.expected_amount) - Number(item.amount_paid),
    ).toFixed(2),
  );
}

function getGateRowOutstandingAmount(item: OutstandingScheduleGateRow) {
  return Number(
    Math.max(
      0,
      Number(item.expected_amount) - Number(item.amount_paid),
    ).toFixed(2),
  );
}

function getDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const directDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directDateMatch) {
    return `${directDateMatch[1]}-${directDateMatch[2]}-${directDateMatch[3]}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsedDate);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function isScheduleDueNow(dueDate: string | null) {
  const dueDateKey = getDateKey(dueDate);

  if (!dueDateKey) {
    return true;
  }

  const todayDateKey = getTodayDateKey();

  return Boolean(todayDateKey) && dueDateKey <= todayDateKey;
}

function compareOutstandingScheduleItems(
  left: OutstandingScheduleGateRow,
  right: OutstandingScheduleGateRow,
) {
  const leftDate = getDateKey(left.due_date) ?? "9999-12-31";
  const rightDate = getDateKey(right.due_date) ?? "9999-12-31";

  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  return left.label.localeCompare(right.label);
}

async function getFirstOutstandingScheduleItem(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
  activePaymentPlanId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_payment_schedule_items")
    .select("id, label, due_date, expected_amount, amount_paid, status")
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .eq("payment_plan_id", params.activePaymentPlanId)
    .in("status", Array.from(PAYABLE_SCHEDULE_STATUSES))
    .returns<OutstandingScheduleGateRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((item) => getGateRowOutstandingAmount(item) > 0)
    .sort(compareOutstandingScheduleItems)[0];
}

async function assertScheduleItemIsPayable(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
  scheduleItem: DeveloperPaymentScheduleItemRow;
  activePaymentPlanId: string;
}) {
  if (params.scheduleItem.payment_plan_id !== params.activePaymentPlanId) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_NOT_ACTIVE",
      "This payment item is not part of the active payment plan.",
      400,
    );
  }

  if (!PAYABLE_SCHEDULE_STATUSES.has(params.scheduleItem.status)) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_NOT_PAYABLE",
      "This payment item is not payable.",
      400,
    );
  }

  const outstandingAmount = getScheduleOutstandingAmount(params.scheduleItem);

  if (outstandingAmount <= 0) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_ALREADY_PAID",
      "This payment item has already been paid.",
      400,
    );
  }

  const firstOutstandingItem = await getFirstOutstandingScheduleItem({
    supabase: params.supabase,
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
    activePaymentPlanId: params.activePaymentPlanId,
  });

  if (
    !firstOutstandingItem ||
    firstOutstandingItem.id !== params.scheduleItem.id
  ) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_SEQUENCE_INVALID",
      "Please pay the next outstanding installment first.",
      400,
    );
  }

  if (!isScheduleDueNow(params.scheduleItem.due_date)) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_NOT_DUE",
      "This installment is not due yet.",
      400,
    );
  }
}

async function resolveActiveSaleAndPlan(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
}) {
  const sale = await getDeveloperSaleById(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
  });

  if (!sale || sale.status !== "active") {
    throw new AppError(
      "DEVELOPER_SALE_NOT_FOUND",
      "Active sale was not found.",
      404,
    );
  }

  const activePlan = await getActiveDeveloperPaymentPlanForSale(
    params.supabase,
    {
      developerAccountId: params.developerAccountId,
      saleId: sale.id,
    },
  );

  if (!activePlan) {
    throw new AppError(
      "DEVELOPER_PAYMENT_PLAN_REQUIRED",
      "Create a payment plan before sending payment requests.",
      400,
    );
  }

  return {
    sale,
    activePlan,
  };
}

async function resolvePayableScheduleItem(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
  scheduleItemId: string;
  activePaymentPlanId: string;
}) {
  const scheduleItem = await getDeveloperPaymentScheduleItemById(
    params.supabase,
    {
      developerAccountId: params.developerAccountId,
      saleId: params.saleId,
      scheduleItemId: params.scheduleItemId,
    },
  );

  if (!scheduleItem) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_NOT_FOUND",
      "Payment item was not found.",
      404,
    );
  }

  await assertScheduleItemIsPayable({
    supabase: params.supabase,
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
    scheduleItem,
    activePaymentPlanId: params.activePaymentPlanId,
  });

  return scheduleItem;
}

function resolveBuyerEmail(params: {
  sale: DeveloperSaleWithDetails;
  fallbackBuyerId: string;
  providedBuyerEmail: string | null;
}) {
  return (
    params.providedBuyerEmail ||
    params.sale.developer_buyers?.email ||
    `developer-buyer-${params.fallbackBuyerId}@boldverseproperty.com`
  );
}

async function generateDeveloperPaymentReceiptSafely(paymentId: string) {
  try {
    await generateDeveloperPaymentReceiptSystem(paymentId);
  } catch (error) {
    console.error("Failed to generate developer payment receipt:", error);
  }
}

async function tryCompleteBuyerPurchaseFromPaidIntent(params: {
  supabase: SupabaseClient;
  intent: {
    status: string;
    sale_id: string;
    developer_account_id: string;
    metadata: Record<string, unknown>;
  };
}) {
  const { tryCompletePurchaseFromPaymentIntent } =
    await import("@/server/services/developer-buyer-purchase.service");

  return tryCompletePurchaseFromPaymentIntent(params);
}

export async function createDeveloperPaymentRequest(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  saleId: string;
  scheduleItemId: string | null;
  amount: number;
  buyerEmail: string | null;
  purchaseLinkId?: string | null;
  callbackUrl?: string | null;
  callbackUrlBuilder?: (reference: string) => string;
  idempotencyScope?: string | null;
}) {
  assertPositiveAmount(params.amount);

  const { sale, activePlan } = await resolveActiveSaleAndPlan({
    supabase: params.supabase,
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
  });

  if (params.amount > Number(sale.total_price_locked)) {
    throw new AppError(
      "DEVELOPER_PAYMENT_AMOUNT_TOO_HIGH",
      "Payment amount cannot exceed the locked sale price.",
      400,
    );
  }

  if (params.scheduleItemId) {
    const scheduleItem = await resolvePayableScheduleItem({
      supabase: params.supabase,
      developerAccountId: params.developerAccountId,
      saleId: sale.id,
      scheduleItemId: params.scheduleItemId,
      activePaymentPlanId: activePlan.id,
    });

    const scheduleOutstandingAmount =
      getScheduleOutstandingAmount(scheduleItem);

    if (params.amount !== scheduleOutstandingAmount) {
      throw new AppError(
        "DEVELOPER_PAYMENT_AMOUNT_MISMATCH",
        "Payment amount must match the selected payment item balance.",
        400,
      );
    }
  }

  const idempotencyScope =
    params.idempotencyScope ??
    (params.purchaseLinkId ? `buyer-purchase:${params.purchaseLinkId}` : null);

  const idempotencyKey = createIdempotencyKey({
    saleId: sale.id,
    scheduleItemId: params.scheduleItemId,
    amount: params.amount,
    scope: idempotencyScope,
  });

  const existingIntent = await getDeveloperPaymentIntentByIdempotencyKey(
    params.supabase,
    {
      developerAccountId: params.developerAccountId,
      idempotencyKey,
    },
  );

  if (
    existingIntent?.status === "initialized" &&
    existingIntent.authorization_url
  ) {
    return existingIntent;
  }

  const fee = calculateDeveloperInstallmentFee(params.amount);
  const totalAmount = Number((params.amount + fee.feeAmount).toFixed(2));
  const reference = createDeveloperPaymentReference();
  const appUrl = getAppUrl();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const buyerEmail = resolveBuyerEmail({
    sale,
    fallbackBuyerId: sale.buyer_id,
    providedBuyerEmail: params.buyerEmail,
  });

  const metadata = {
    product: "boldverse_developer_module",
    payment_type: "developer_installment",
    developer_account_id: params.developerAccountId,
    sale_id: sale.id,
    buyer_id: sale.buyer_id,
    estate_id: sale.estate_id,
    plot_id: sale.plot_id,
    schedule_item_id: params.scheduleItemId,
    installment_amount: params.amount,
    platform_fee_amount: fee.feeAmount,
    platform_fee_percentage: fee.percentage,
    total_amount: totalAmount,
    currency_code: "NGN",
    ...(params.purchaseLinkId
      ? { purchase_link_id: params.purchaseLinkId }
      : {}),
  };

  const callbackUrlFromBuilder = params.callbackUrlBuilder?.(reference).trim();

  const callbackUrl =
    callbackUrlFromBuilder ||
    params.callbackUrl?.trim() ||
    `${appUrl}/dev/pay/${reference}?verify=1`;

  const initialized = await initializeStandardPaystackTransaction({
    email: buyerEmail,
    amountKobo: convertNairaToKobo(totalAmount),
    reference,
    callbackUrl,
    currencyCode: "NGN",
    metadata,
  });

  const intent = await createDeveloperPaymentIntent(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: sale.id,
    buyerId: sale.buyer_id,
    estateId: sale.estate_id,
    plotId: sale.plot_id,
    scheduleItemId: params.scheduleItemId,
    paystackReference: reference,
    paystackAccessCode: initialized.access_code,
    authorizationUrl: initialized.authorization_url,
    installmentAmount: params.amount,
    platformFeeAmount: fee.feeAmount,
    totalAmount,
    currencyCode: "NGN",
    expiresAt,
    idempotencyKey,
    metadata,
  });

  await createDeveloperPaymentAllocations(params.supabase, {
    developerAccountId: params.developerAccountId,
    paymentIntentId: intent.id,
    saleId: sale.id,
    buyerId: sale.buyer_id,
    installmentAmount: params.amount,
    platformFeeAmount: fee.feeAmount,
    currencyCode: "NGN",
  });

  return intent;
}

export async function createBuyerPortalSchedulePaymentRequest(params: {
  supabase: SupabaseClient;
  token: string;
  scheduleItemId: string;
}) {
  const token = params.token.trim();
  const scheduleItemId = params.scheduleItemId.trim();

  if (!token) {
    throw new AppError(
      "BUYER_PORTAL_TOKEN_REQUIRED",
      "Buyer portal token is required.",
      400,
    );
  }

  if (!scheduleItemId) {
    throw new AppError(
      "DEVELOPER_SCHEDULE_ITEM_REQUIRED",
      "Payment item is required.",
      400,
    );
  }

  const accessToken = await getActiveBuyerSaleAccessTokenByHash(
    params.supabase,
    hashBuyerPortalToken(token),
  );

  if (!accessToken) {
    throw new AppError(
      "BUYER_PORTAL_TOKEN_INVALID",
      "This buyer payment portal link is invalid or has been revoked.",
      404,
    );
  }

  if (
    accessToken.expires_at &&
    new Date(accessToken.expires_at).getTime() < Date.now()
  ) {
    throw new AppError(
      "BUYER_PORTAL_TOKEN_EXPIRED",
      "This buyer payment portal link has expired.",
      410,
    );
  }

  const { sale, activePlan } = await resolveActiveSaleAndPlan({
    supabase: params.supabase,
    developerAccountId: accessToken.developer_account_id,
    saleId: accessToken.sale_id,
  });

  if (sale.buyer_id !== accessToken.buyer_id) {
    throw new AppError(
      "BUYER_PORTAL_SALE_MISMATCH",
      "This buyer payment portal link does not match the sale record.",
      403,
    );
  }

  const scheduleItem = await resolvePayableScheduleItem({
    supabase: params.supabase,
    developerAccountId: accessToken.developer_account_id,
    saleId: accessToken.sale_id,
    scheduleItemId,
    activePaymentPlanId: activePlan.id,
  });

  const amount = getScheduleOutstandingAmount(scheduleItem);
  const appUrl = getAppUrl();

  const intent = await createDeveloperPaymentRequest({
    supabase: params.supabase,
    developerAccountId: accessToken.developer_account_id,
    saleId: accessToken.sale_id,
    scheduleItemId: scheduleItem.id,
    amount,
    buyerEmail: sale.developer_buyers?.email ?? null,
    idempotencyScope: `buyer-portal:${accessToken.id}`,
    callbackUrlBuilder: (reference) =>
      `${appUrl}/dev/buyer/payment/callback?reference=${encodeURIComponent(
        reference,
      )}&portalToken=${encodeURIComponent(token)}`,
  });

  if (!intent.authorization_url) {
    throw new AppError(
      "DEVELOPER_PAYMENT_AUTHORIZATION_URL_MISSING",
      "Payment could not be initialized.",
      500,
    );
  }

  return {
    intent,
    authorizationUrl: intent.authorization_url,
  };
}

export async function getPublicDeveloperPaymentCheckout(params: {
  supabase: SupabaseClient;
  reference: string;
  verify?: boolean;
}) {
  let buyerPortalUrl: string | null = null;

  if (params.verify) {
    const verification = await verifyAndPostDeveloperPaymentReference({
      supabase: params.supabase,
      reference: params.reference,
    });

    buyerPortalUrl = verification.buyerPortalUrl ?? null;
  }

  const intent = await getDeveloperPaymentIntentByReference(
    params.supabase,
    params.reference,
  );

  if (!intent) {
    return null;
  }

  return {
    intent,
    buyerPortalUrl,
  };
}

export async function verifyAndPostDeveloperPaymentReference(params: {
  supabase: SupabaseClient;
  reference: string;
}) {
  const intent = await getDeveloperPaymentIntentByReference(
    params.supabase,
    params.reference,
  );

  if (!intent) {
    throw new AppError(
      "DEVELOPER_PAYMENT_INTENT_NOT_FOUND",
      "Payment request was not found.",
      404,
    );
  }

  if (intent.status === "paid" && intent.processed_payment_id) {
    await generateDeveloperPaymentReceiptSafely(intent.processed_payment_id);

    const buyerPortal = await tryCompleteBuyerPurchaseFromPaidIntent({
      supabase: params.supabase,
      intent,
    });

    return {
      status: "duplicate" as const,
      paymentId: intent.processed_payment_id,
      buyerPortalUrl: buyerPortal?.portalUrl ?? null,
    };
  }

  if (intent.status !== "initialized") {
    throw new AppError(
      "DEVELOPER_PAYMENT_INTENT_NOT_PAYABLE",
      "This payment request can no longer be verified.",
      400,
    );
  }

  const verified = await verifyPaystackTransaction(params.reference);

  if (verified.reference !== intent.paystack_reference) {
    throw new AppError(
      "DEVELOPER_PAYSTACK_REFERENCE_MISMATCH",
      "Payment reference does not match.",
      400,
    );
  }

  if (verified.currency !== intent.currency_code) {
    throw new AppError(
      "DEVELOPER_PAYSTACK_CURRENCY_MISMATCH",
      "Payment currency does not match.",
      400,
    );
  }

  if (verified.status !== "success") {
    throw new AppError(
      "DEVELOPER_PAYSTACK_NOT_SUCCESSFUL",
      "Payment was not successful.",
      400,
    );
  }

  assertPaystackAmountMatchesExpected({
    paystackAmountInKobo: verified.amount,
    expectedAmountInNaira: intent.total_amount,
  });

  const { data, error } = await params.supabase
    .rpc("post_developer_verified_payment", {
      p_payment_intent_id: intent.id,
      p_paystack_reference: intent.paystack_reference,
      p_verified_total_amount: intent.total_amount,
      p_verified_paid_at: verified.paid_at ?? new Date().toISOString(),
    })
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  const buyerPortal = await tryCompleteBuyerPurchaseFromPaidIntent({
    supabase: params.supabase,
    intent: {
      ...intent,
      status: "paid",
    },
  });

  await generateDeveloperPaymentReceiptSafely(data.id);

  return {
    status: "processed" as const,
    paymentId: data.id,
    verifiedPayload: toRecord(verified),
    buyerPortalUrl: buyerPortal?.portalUrl ?? null,
  };
}

export function getDeveloperPaymentFeePercentage(amount: number) {
  return getDeveloperInstallmentFeePercentage(amount);
}
