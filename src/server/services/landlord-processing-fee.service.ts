import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { TENANT_ONBOARDING_STATUSES } from "@/server/constants/onboarding-lifecycle";
import { AppError } from "@/server/errors/app-error";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import {
  createLandlordProcessingFeeIntent,
  getLandlordProcessingFeeIntentByReference,
  getLatestLandlordProcessingFeeIntentForTenant,
  getPaidLandlordProcessingFeeIntentForTenant,
  markLandlordProcessingFeeIntentFailed,
  markLandlordProcessingFeeIntentPaid,
} from "@/server/repositories/landlord-processing-fee.repository";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { officiallySubmitLandlordTenantOnboardingAfterPayment } from "@/server/services/onboarding.service";
import {
  assertLandlordProcessingFeeEnabled,
  getLandlordProcessingFeeConfiguration,
} from "@/server/services/platform-payment-settings.service";
import {
  convertNairaToKobo,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { assertLandlordPayoutVerified } from "@/server/services/paystack-verification.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const LANDLORD_PROCESSING_CURRENCY = "NGN";

function createPaymentReference() {
  return `tenuro_landlord_fee_${crypto.randomUUID().replaceAll("-", "")}`;
}

function createIdempotencyKey() {
  return crypto.randomUUID();
}

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function getTenantPaymentEmail(params: {
  email: string | null;
  phoneNumber: string;
}) {
  const email = params.email?.trim().toLowerCase();

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return email;
  }

  const sanitizedPhone = params.phoneNumber.replace(/\D/g, "");

  if (sanitizedPhone.length >= 7) {
    return `tenant-${sanitizedPhone}@tenuro.app`;
  }

  return "payments@boldverseproperty.com";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function buildCallbackUrl(params: { token: string; reference: string }) {
  return `${getAppBaseUrl()}/t/onboarding/${encodeURIComponent(
    params.token,
  )}?verifyProcessingFee=1&reference=${encodeURIComponent(params.reference)}`;
}

export async function hasPaidLandlordTenantProcessingFee(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  const paidIntent = await getPaidLandlordProcessingFeeIntentForTenant(
    supabase,
    tenantId,
  );

  return Boolean(paidIntent);
}

export async function resolveLandlordTenantProcessingFeeForOnboarding(params: {
  tenant: TenantOnboardingResolvedRecord;
  token: string;
}) {
  const feeConfiguration = await getLandlordProcessingFeeConfiguration();

  if (
    params.tenant.onboarding_status !==
    TENANT_ONBOARDING_STATUSES.documentsSubmitted
  ) {
    return {
      required: true as const,
      status: "awaiting_kyc" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: feeConfiguration.totalAmount,
      currencyCode: LANDLORD_PROCESSING_CURRENCY,
    };
  }

  if (!feeConfiguration.isEnabled) {
    return {
      required: true as const,
      status: "disabled" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: feeConfiguration.totalAmount,
      currencyCode: LANDLORD_PROCESSING_CURRENCY,
    };
  }

  const supabase = createSupabaseAdminClient();

  const paidIntent = await getPaidLandlordProcessingFeeIntentForTenant(
    supabase,
    params.tenant.id,
  );

  if (paidIntent) {
    return {
      required: true as const,
      status: "paid" as const,
      authorizationUrl: null,
      reference: paidIntent.paystack_reference,
      processingFeeAmount: Number(paidIntent.processing_fee_amount),
      currencyCode: paidIntent.currency_code,
    };
  }

  const landlordPaystackAccount = await getActiveLandlordPaystackAccount(
    supabase,
    params.tenant.landlord_id,
  );

  const verifiedLandlordPaystackAccount =
    assertLandlordPayoutVerified(landlordPaystackAccount);

  const latestIntent = await getLatestLandlordProcessingFeeIntentForTenant(
    supabase,
    params.tenant.id,
  );

  if (latestIntent?.status === "initialized") {
    return {
      required: true as const,
      status: "initialized" as const,
      authorizationUrl: latestIntent.authorization_url,
      reference: latestIntent.paystack_reference,
      processingFeeAmount: Number(latestIntent.processing_fee_amount),
      currencyCode: latestIntent.currency_code,
    };
  }

  assertLandlordProcessingFeeEnabled(feeConfiguration);

  const reference = createPaymentReference();
  const totalAmountKobo = convertNairaToKobo(feeConfiguration.totalAmount);
  const platformShareKobo = convertNairaToKobo(
    feeConfiguration.platformShareAmount,
  );

  const metadata = {
    payment_purpose: "landlord_verification_processing_fee",
    tenant_id: params.tenant.id,
    landlord_id: params.tenant.landlord_id,
    processing_fee_amount: feeConfiguration.totalAmount,
    landlord_share_amount: feeConfiguration.landlordShareAmount,
    tenuro_share_amount: feeConfiguration.platformShareAmount,
    platform_payment_settings_id: feeConfiguration.settingsId,
    paystack_mode: "subaccount_transaction_charge",
    subaccount_code: verifiedLandlordPaystackAccount.paystack_subaccount_code,
  };

  const initializedTransaction = await initializePaystackTransaction({
    email: getTenantPaymentEmail({
      email: params.tenant.email,
      phoneNumber: params.tenant.phone_number,
    }),
    amountKobo: totalAmountKobo,
    reference,
    callbackUrl: buildCallbackUrl({
      token: params.token,
      reference,
    }),
    subaccountCode: verifiedLandlordPaystackAccount.paystack_subaccount_code,
    transactionChargeKobo: platformShareKobo,
    currencyCode: LANDLORD_PROCESSING_CURRENCY,
    metadata,
  });

  const intent = await createLandlordProcessingFeeIntent(supabase, {
    tenantId: params.tenant.id,
    landlordId: params.tenant.landlord_id,
    paystackReference: initializedTransaction.reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    processingFeeAmount: feeConfiguration.totalAmount,
    landlordShareAmount: feeConfiguration.landlordShareAmount,
    tenuroShareAmount: feeConfiguration.platformShareAmount,
    totalAmount: feeConfiguration.totalAmount,
    currencyCode: LANDLORD_PROCESSING_CURRENCY,
    idempotencyKey: createIdempotencyKey(),
    paystackSplitCode: null,
    paystackSplitId: null,
    metadata,
  });

  await writeSystemAuditLog({
    landlordId: params.tenant.landlord_id,
    tenantId: params.tenant.id,
    eventType: AUDIT_EVENT_TYPES.landlordVerificationFeeInitialized,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: intent.id,
    description: "Landlord-sourced tenant verification fee payment initialized.",
    metadata: {
      audit_subtype: "landlord_verification_fee_initialized",
      paystack_reference: intent.paystack_reference,
      processing_fee_amount: intent.processing_fee_amount,
      subaccount_code: verifiedLandlordPaystackAccount.paystack_subaccount_code,
    },
  });

  return {
    required: true as const,
    status: "initialized" as const,
    authorizationUrl: intent.authorization_url,
    reference: intent.paystack_reference,
    processingFeeAmount: Number(intent.processing_fee_amount),
    currencyCode: intent.currency_code,
  };
}

export async function verifyLandlordTenantProcessingFeeReference(
  reference: string,
) {
  const supabase = createSupabaseAdminClient();

  const intent = await getLandlordProcessingFeeIntentByReference(
    supabase,
    reference,
  );

  if (!intent) {
    throw new AppError(
      "LANDLORD_PROCESSING_FEE_NOT_FOUND",
      "Processing fee payment reference was not found.",
      404,
    );
  }

  if (intent.status === "paid") {
    await officiallySubmitLandlordTenantOnboardingAfterPayment({
      tenantId: intent.tenant_id,
      verificationFeeIntentId: intent.id,
      verificationFeePaidAt: intent.paid_at ?? new Date().toISOString(),
    });

    return intent;
  }

  const verifiedTransaction = await verifyPaystackTransaction(reference);
  const verifiedPayload = toRecord(verifiedTransaction);

  if (verifiedTransaction.reference !== intent.paystack_reference) {
    throw new AppError(
      "PAYSTACK_REFERENCE_MISMATCH",
      "Payment reference does not match the initialized processing fee.",
      400,
    );
  }

  if (verifiedTransaction.currency !== intent.currency_code) {
    throw new AppError(
      "PAYSTACK_CURRENCY_MISMATCH",
      "Payment currency does not match the initialized processing fee.",
      400,
    );
  }

  if (verifiedTransaction.status !== "success") {
    await markLandlordProcessingFeeIntentFailed(supabase, {
      intentId: intent.id,
      status:
        verifiedTransaction.status === "abandoned" ? "abandoned" : "failed",
      failureReason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
    });

    throw new AppError(
      "LANDLORD_PROCESSING_FEE_NOT_PAID",
      "Processing fee payment was not successful.",
      400,
    );
  }

  const expectedKobo = convertNairaToKobo(Number(intent.total_amount));

  if (Math.abs(verifiedTransaction.amount - expectedKobo) >= 1) {
    throw new AppError(
      "PAYSTACK_AMOUNT_MISMATCH",
      "Processing fee amount does not match the initialized payment.",
      400,
    );
  }

  const paidIntent = await markLandlordProcessingFeeIntentPaid(supabase, {
    intentId: intent.id,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
  });

  await writeSystemAuditLog({
    landlordId: paidIntent.landlord_id,
    tenantId: paidIntent.tenant_id,
    eventType: AUDIT_EVENT_TYPES.landlordVerificationFeePaid,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: paidIntent.id,
    description: "Landlord-sourced tenant verification fee payment confirmed.",
    metadata: {
      audit_subtype: "landlord_verification_fee_paid",
      paystack_reference: paidIntent.paystack_reference,
      processing_fee_amount: paidIntent.processing_fee_amount,
      paid_at: paidIntent.paid_at,
      payment_does_not_guarantee_approval: true,
    },
  });

  await officiallySubmitLandlordTenantOnboardingAfterPayment({
    tenantId: paidIntent.tenant_id,
    verificationFeeIntentId: paidIntent.id,
    verificationFeePaidAt: paidIntent.paid_at ?? new Date().toISOString(),
  });

  return paidIntent;
}
