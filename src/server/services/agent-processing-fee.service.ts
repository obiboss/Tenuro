import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { TENANT_ONBOARDING_STATUSES } from "@/server/constants/onboarding-lifecycle";
import { AppError } from "@/server/errors/app-error";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import {
  createAgentProcessingFeeIntent,
  getAgentProcessingFeeIntentByReference,
  getLatestAgentProcessingFeeIntentForTenant,
  getPaidAgentProcessingFeeIntentForTenant,
  markAgentProcessingFeeIntentFailed,
  markAgentProcessingFeeIntentPaid,
} from "@/server/repositories/agent-processing-fee.repository";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { officiallySubmitAgentTenantOnboardingAfterPayment } from "@/server/services/onboarding.service";
import {
  assertAgentProcessingFeeEnabled,
  getAgentProcessingFeeConfiguration,
} from "@/server/services/platform-payment-settings.service";
import {
  convertNairaToKobo,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { assertAgentPayoutVerified } from "@/server/services/paystack-verification.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const AGENT_PROCESSING_CURRENCY = "NGN";

function createPaymentReference() {
  return `tenuro_agent_fee_${crypto.randomUUID().replaceAll("-", "")}`;
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

function assertAgentSourcedTenant(
  tenant: Pick<
    TenantOnboardingResolvedRecord,
    "id" | "landlord_id" | "agent_property_listing_id" | "invited_by_agent_id"
  >,
) {
  if (!tenant.agent_property_listing_id || !tenant.invited_by_agent_id) {
    return null;
  }

  return {
    agentId: tenant.invited_by_agent_id,
    agentPropertyListingId: tenant.agent_property_listing_id,
  };
}

function buildCallbackUrl(params: { token: string; reference: string }) {
  return `${getAppBaseUrl()}/t/onboarding/${encodeURIComponent(
    params.token,
  )}?verifyProcessingFee=1&reference=${encodeURIComponent(params.reference)}`;
}

export async function hasPaidAgentTenantProcessingFee(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  const paidIntent = await getPaidAgentProcessingFeeIntentForTenant(
    supabase,
    tenantId,
  );

  return Boolean(paidIntent);
}

export async function resolveAgentTenantProcessingFeeForOnboarding(params: {
  tenant: TenantOnboardingResolvedRecord;
  token: string;
}) {
  const agentSource = assertAgentSourcedTenant(params.tenant);

  if (!agentSource) {
    return {
      required: false as const,
      status: "not_required" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: 0,
      currencyCode: AGENT_PROCESSING_CURRENCY,
    };
  }

  const feeConfiguration = await getAgentProcessingFeeConfiguration();

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
      currencyCode: AGENT_PROCESSING_CURRENCY,
    };
  }

  if (!feeConfiguration.isEnabled) {
    return {
      required: true as const,
      status: "disabled" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: feeConfiguration.totalAmount,
      currencyCode: AGENT_PROCESSING_CURRENCY,
    };
  }

  const supabase = createSupabaseAdminClient();

  const paidIntent = await getPaidAgentProcessingFeeIntentForTenant(
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

  const agentPaystackAccount = await getActiveAgentPaystackAccount(
    supabase,
    agentSource.agentId,
  );

  const verifiedAgentPaystackAccount =
    assertAgentPayoutVerified(agentPaystackAccount);

  const latestIntent = await getLatestAgentProcessingFeeIntentForTenant(
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

  assertAgentProcessingFeeEnabled(feeConfiguration);

  const reference = createPaymentReference();
  const totalAmountKobo = convertNairaToKobo(feeConfiguration.totalAmount);
  const platformShareKobo = convertNairaToKobo(
    feeConfiguration.platformShareAmount,
  );

  const metadata = {
    payment_purpose: "agent_verification_processing_fee",
    tenant_id: params.tenant.id,
    landlord_id: params.tenant.landlord_id,
    agent_id: agentSource.agentId,
    agent_property_listing_id: agentSource.agentPropertyListingId,
    processing_fee_amount: feeConfiguration.totalAmount,
    agent_share_amount: feeConfiguration.agentShareAmount,
    tenuro_share_amount: feeConfiguration.platformShareAmount,
    platform_payment_settings_id: feeConfiguration.settingsId,
    paystack_mode: "subaccount_transaction_charge",
    subaccount_code: verifiedAgentPaystackAccount.paystack_subaccount_code,
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
    subaccountCode: verifiedAgentPaystackAccount.paystack_subaccount_code,
    transactionChargeKobo: platformShareKobo,
    currencyCode: AGENT_PROCESSING_CURRENCY,
    metadata,
  });

  const intent = await createAgentProcessingFeeIntent(supabase, {
    tenantId: params.tenant.id,
    landlordId: params.tenant.landlord_id,
    agentId: agentSource.agentId,
    agentPropertyListingId: agentSource.agentPropertyListingId,
    paystackReference: initializedTransaction.reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    processingFeeAmount: feeConfiguration.totalAmount,
    agentShareAmount: feeConfiguration.agentShareAmount,
    tenuroShareAmount: feeConfiguration.platformShareAmount,
    totalAmount: feeConfiguration.totalAmount,
    currencyCode: AGENT_PROCESSING_CURRENCY,
    idempotencyKey: createIdempotencyKey(),
    paystackSplitCode: null,
    paystackSplitId: null,
    metadata,
  });

  await writeSystemAuditLog({
    landlordId: params.tenant.landlord_id,
    tenantId: params.tenant.id,
    eventType: AUDIT_EVENT_TYPES.agentVerificationFeeInitialized,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: intent.id,
    description: "Agent tenant verification fee payment initialized.",
    metadata: {
      audit_subtype: "agent_verification_fee_initialized",
      agent_id: agentSource.agentId,
      agent_property_listing_id: agentSource.agentPropertyListingId,
      paystack_reference: intent.paystack_reference,
      processing_fee_amount: intent.processing_fee_amount,
      subaccount_code: verifiedAgentPaystackAccount.paystack_subaccount_code,
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

export async function verifyAgentTenantProcessingFeeReference(
  reference: string,
) {
  const supabase = createSupabaseAdminClient();

  const intent = await getAgentProcessingFeeIntentByReference(
    supabase,
    reference,
  );

  if (!intent) {
    throw new AppError(
      "AGENT_PROCESSING_FEE_NOT_FOUND",
      "Processing fee payment reference was not found.",
      404,
    );
  }

  if (intent.status === "paid") {
    await officiallySubmitAgentTenantOnboardingAfterPayment({
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
    await markAgentProcessingFeeIntentFailed(supabase, {
      intentId: intent.id,
      status:
        verifiedTransaction.status === "abandoned" ? "abandoned" : "failed",
      failureReason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
    });

    throw new AppError(
      "AGENT_PROCESSING_FEE_NOT_PAID",
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

  const paidIntent = await markAgentProcessingFeeIntentPaid(supabase, {
    intentId: intent.id,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
  });

  await writeSystemAuditLog({
    landlordId: paidIntent.landlord_id,
    tenantId: paidIntent.tenant_id,
    eventType: AUDIT_EVENT_TYPES.agentVerificationFeePaid,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: paidIntent.id,
    description: "Agent tenant verification fee payment confirmed.",
    metadata: {
      audit_subtype: "agent_verification_fee_paid",
      agent_id: paidIntent.agent_id,
      agent_property_listing_id: paidIntent.agent_property_listing_id,
      paystack_reference: paidIntent.paystack_reference,
      processing_fee_amount: paidIntent.processing_fee_amount,
      paid_at: paidIntent.paid_at,
      payment_does_not_guarantee_approval: true,
    },
  });

  await officiallySubmitAgentTenantOnboardingAfterPayment({
    tenantId: paidIntent.tenant_id,
    verificationFeeIntentId: paidIntent.id,
    verificationFeePaidAt: paidIntent.paid_at ?? new Date().toISOString(),
  });

  return paidIntent;
}
