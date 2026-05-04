import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createGatewayPaymentIntent,
  getGatewayPaymentIntentByIdempotencyKey,
  getGatewayPaymentIntentByReference,
} from "@/server/repositories/gateway-payment.repository";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import { getTenancyAgreementByTenancyId } from "@/server/repositories/tenancy-agreements.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { InitializeRentPaymentInput } from "@/server/validators/payment.schema";
import { requireLandlord } from "./auth.service";
import { processVerifiedGatewayPaymentReference } from "./gateway-payment-webhook.service";
import {
  convertNairaToKobo,
  initializePaystackTransaction,
} from "./paystack.service";
import { getTenantRentReceiptDownloadUrlByGatewayReference } from "./receipts.service";

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function getTenantPaymentUrl(reference: string) {
  return `${getAppBaseUrl()}/t/pay/${reference}`;
}

function getTenantPaymentVerifyUrl(reference: string) {
  return `${getTenantPaymentUrl(reference)}?verify=1`;
}

function formatNairaAmount(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildTenantPaymentMessage(params: {
  tenantName: string;
  landlordName: string;
  propertyName: string;
  unitName: string;
  rentAmount: number;
  paymentUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `${params.landlordName} has sent your rent payment link for ${params.unitName} at ${params.propertyName}.`,
    "",
    `Rent amount: ${formatNairaAmount(params.rentAmount)}`,
    "",
    "Please use this secure link to review the amount and continue to Paystack:",
    params.paymentUrl,
    "",
    "Your tenant account activation will only be available after your full payment is confirmed.",
  ].join("\n");
}

function getTenuroGatewayAdminFee() {
  const value = process.env.TENURO_GATEWAY_ADMIN_FEE_NAIRA;

  if (!value) {
    throw new AppError(
      "TENURO_GATEWAY_FEE_MISSING",
      "Gateway fee is not configured.",
      500,
    );
  }

  const fee = Number(value);

  if (!Number.isFinite(fee) || fee < 0) {
    throw new AppError(
      "TENURO_GATEWAY_FEE_INVALID",
      "Gateway fee is not configured correctly.",
      500,
    );
  }

  return fee;
}

function createPaymentReference() {
  return `tenuro_${crypto.randomUUID().replaceAll("-", "")}`;
}

function getTenantPaymentEmail(params: {
  tenantEmail: string | null;
  tenantPhoneNumber: string;
}) {
  const email = params.tenantEmail?.trim().toLowerCase();

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return email;
  }

  const sanitizedPhone = params.tenantPhoneNumber.replace(/\D/g, "");

  if (sanitizedPhone.length >= 7) {
    return `tenant-${sanitizedPhone}@tenuro.app`;
  }

  return "payments@tenuro.app";
}

function assertGatewayAmountStructure(params: {
  rentAmount: number;
  tenuroFeeAmount: number;
  totalAmount: number;
}) {
  if (params.rentAmount <= 0) {
    throw new AppError(
      "RENT_AMOUNT_INVALID",
      "Rent amount must be greater than zero.",
      400,
    );
  }

  if (params.tenuroFeeAmount < 0) {
    throw new AppError(
      "GATEWAY_FEE_INVALID",
      "Gateway fee cannot be negative.",
      500,
    );
  }

  if (params.totalAmount !== params.rentAmount + params.tenuroFeeAmount) {
    throw new AppError(
      "GATEWAY_TOTAL_MISMATCH",
      "Payment total does not match rent plus gateway fee.",
      500,
    );
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readMetadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

export async function initializeRentPayment(input: InitializeRentPaymentInput) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyPaymentContext(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to receive payment for this rental agreement.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Payment can only be made for an active rental agreement.",
      400,
    );
  }

  if (!tenancy.tenants) {
    throw new AppError(
      "TENANT_NOT_FOUND",
      "We could not find the tenant for this payment.",
      404,
    );
  }

  const tenantPhone = normalisePhoneNumber(tenancy.tenants.phone_number);
  const propertyName =
    tenancy.units?.properties?.property_name ?? "your apartment";
  const unitName = tenancy.units?.unit_identifier ?? "your unit";

  const existingIntent = await getGatewayPaymentIntentByIdempotencyKey(
    supabase,
    {
      landlordId: landlord.id,
      idempotencyKey: input.idempotencyKey,
    },
  );

  if (existingIntent) {
    const tenantPaymentUrl = getTenantPaymentUrl(
      existingIntent.paystack_reference,
    );

    return {
      tenantId: tenancy.tenant_id,
      authorizationUrl: existingIntent.authorization_url,
      accessCode: existingIntent.paystack_access_code,
      reference: existingIntent.paystack_reference,
      tenantPaymentUrl,
      tenantWhatsappNumber: tenantPhone.national,
      whatsappMessage: buildTenantPaymentMessage({
        tenantName: tenancy.tenants.full_name,
        landlordName: landlord.fullName,
        propertyName,
        unitName,
        rentAmount: Number(existingIntent.rent_amount),
        paymentUrl: tenantPaymentUrl,
      }),
    };
  }

  const agreement = await getTenancyAgreementByTenancyId(supabase, tenancy.id);

  if (agreement?.document_status !== "accepted") {
    throw new AppError(
      "AGREEMENT_NOT_ACCEPTED",
      "The tenant must accept the tenancy agreement before a rent payment link can be sent.",
      400,
    );
  }

  const paystackAccount = await getActiveLandlordPaystackAccount(
    supabase,
    landlord.id,
  );

  if (!paystackAccount) {
    throw new AppError(
      "BANK_ACCOUNT_REQUIRED",
      "Set up your payout bank account before accepting gateway payments.",
      400,
    );
  }

  const rentAmount = input.amount;
  const tenuroFeeAmount = getTenuroGatewayAdminFee();
  const totalAmount = rentAmount + tenuroFeeAmount;

  assertGatewayAmountStructure({
    rentAmount,
    tenuroFeeAmount,
    totalAmount,
  });

  const tenuroFeeKobo = convertNairaToKobo(tenuroFeeAmount);
  const totalAmountKobo = convertNairaToKobo(totalAmount);
  const reference = createPaymentReference();

  const metadata = {
    tenancy_id: tenancy.id,
    tenant_id: tenancy.tenant_id,
    landlord_id: tenancy.landlord_id,
    expected_amount_naira: rentAmount,
    tenuro_fee_naira: tenuroFeeAmount,
    total_amount_naira: totalAmount,
    currency_code: tenancy.currency_code,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    idempotency_key: input.idempotencyKey,
    property_name: propertyName,
    unit_identifier: unitName,
    paystack_split: {
      mode: "subaccount_flat_fee",
      subaccount: paystackAccount.paystack_subaccount_code,
      transaction_charge_kobo: tenuroFeeKobo,
      bearer: "subaccount",
    },
  };

  const initializedTransaction = await initializePaystackTransaction({
    email: getTenantPaymentEmail({
      tenantEmail: tenancy.tenants.email,
      tenantPhoneNumber: tenancy.tenants.phone_number,
    }),
    amountKobo: totalAmountKobo,
    reference,
    callbackUrl: getTenantPaymentVerifyUrl(reference),
    subaccountCode: paystackAccount.paystack_subaccount_code,
    transactionChargeKobo: tenuroFeeKobo,
    currencyCode: tenancy.currency_code,
    metadata,
  });

  const intent = await createGatewayPaymentIntent(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    paystackReference: initializedTransaction.reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    rentAmount,
    tenuroFeeAmount,
    totalAmount,
    currencyCode: tenancy.currency_code,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    idempotencyKey: input.idempotencyKey,
    metadata,
  });

  const tenantPaymentUrl = getTenantPaymentUrl(intent.paystack_reference);

  return {
    tenantId: tenancy.tenant_id,
    authorizationUrl: intent.authorization_url,
    accessCode: intent.paystack_access_code,
    reference: intent.paystack_reference,
    tenantPaymentUrl,
    tenantWhatsappNumber: tenantPhone.national,
    whatsappMessage: buildTenantPaymentMessage({
      tenantName: tenancy.tenants.full_name,
      landlordName: landlord.fullName,
      propertyName,
      unitName,
      rentAmount,
      paymentUrl: tenantPaymentUrl,
    }),
  };
}

export async function getPublicTenantPaymentCheckout(params: {
  reference: string;
  verify?: boolean;
}) {
  const supabase = createSupabaseAdminClient();

  if (params.verify) {
    try {
      await processVerifiedGatewayPaymentReference(params.reference);
    } catch (error) {
      console.error("Public tenant payment verification failed:", error);
    }
  }

  const intent = await getGatewayPaymentIntentByReference(
    supabase,
    params.reference,
  );

  if (!intent) {
    return null;
  }

  const metadata = toRecord(intent.metadata);

  const receiptDownloadUrl =
    intent.status === "paid"
      ? await getTenantRentReceiptDownloadUrlByGatewayReference(
          intent.paystack_reference,
        )
      : null;

  return {
    id: intent.id,
    reference: intent.paystack_reference,
    authorizationUrl: intent.authorization_url,
    rentAmount: Number(intent.rent_amount),
    tenuroFeeAmount: Number(intent.tenuro_fee_amount),
    totalAmount: Number(intent.total_amount),
    currencyCode: intent.currency_code,
    status: intent.status,
    paidAt: intent.paid_at,
    propertyName: readMetadataText(metadata, "property_name"),
    unitIdentifier: readMetadataText(metadata, "unit_identifier"),
    periodStart: intent.period_start,
    periodEnd: intent.period_end,
    receiptDownloadUrl,
  };
}
