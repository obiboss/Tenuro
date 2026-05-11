import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
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
import {
  convertNairaToKobo,
  createTransactionSplit,
  initializePaystackMultiSplitTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const AGENT_PROCESSING_TOTAL_AMOUNT = 15_000;
const AGENT_PROCESSING_AGENT_SHARE = 10_000;
const AGENT_PROCESSING_TENURO_SHARE = 5_000;
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
      agentShareAmount: 0,
      tenuroShareAmount: 0,
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
      agentShareAmount: Number(paidIntent.agent_share_amount),
      tenuroShareAmount: Number(paidIntent.tenuro_share_amount),
      currencyCode: paidIntent.currency_code,
    };
  }

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
      agentShareAmount: Number(latestIntent.agent_share_amount),
      tenuroShareAmount: Number(latestIntent.tenuro_share_amount),
      currencyCode: latestIntent.currency_code,
    };
  }

  const agentPaystackAccount = await getActiveAgentPaystackAccount(
    supabase,
    agentSource.agentId,
  );

  if (!agentPaystackAccount) {
    throw new AppError(
      "AGENT_PAYOUT_ACCOUNT_REQUIRED",
      "The agent payout account is not ready. Please ask the agent to complete their payout setup.",
      400,
    );
  }

  const reference = createPaymentReference();
  const split = await createTransactionSplit({
    name: `BOPA Agent Processing Fee ${reference}`,
    landlordSubaccountCode: agentPaystackAccount.paystack_subaccount_code,
    landlordShareKobo: convertNairaToKobo(AGENT_PROCESSING_AGENT_SHARE),
    currencyCode: AGENT_PROCESSING_CURRENCY,
  });

  const metadata = {
    payment_purpose: "agent_tenant_processing_fee",
    tenant_id: params.tenant.id,
    landlord_id: params.tenant.landlord_id,
    agent_id: agentSource.agentId,
    agent_property_listing_id: agentSource.agentPropertyListingId,
    processing_fee_amount: AGENT_PROCESSING_TOTAL_AMOUNT,
    agent_share_amount: AGENT_PROCESSING_AGENT_SHARE,
    tenuro_share_amount: AGENT_PROCESSING_TENURO_SHARE,
    split_code: split.split_code,
    split_id: split.id,
  };

  const initializedTransaction = await initializePaystackMultiSplitTransaction({
    email: getTenantPaymentEmail({
      email: params.tenant.email,
      phoneNumber: params.tenant.phone_number,
    }),
    amountKobo: convertNairaToKobo(AGENT_PROCESSING_TOTAL_AMOUNT),
    reference,
    callbackUrl: buildCallbackUrl({
      token: params.token,
      reference,
    }),
    splitCode: split.split_code,
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
    processingFeeAmount: AGENT_PROCESSING_TOTAL_AMOUNT,
    agentShareAmount: AGENT_PROCESSING_AGENT_SHARE,
    tenuroShareAmount: AGENT_PROCESSING_TENURO_SHARE,
    totalAmount: AGENT_PROCESSING_TOTAL_AMOUNT,
    currencyCode: AGENT_PROCESSING_CURRENCY,
    idempotencyKey: createIdempotencyKey(),
    paystackSplitCode: split.split_code,
    paystackSplitId: split.id,
    metadata,
  });

  await writeSystemAuditLog({
    landlordId: params.tenant.landlord_id,
    tenantId: params.tenant.id,
    eventType: AUDIT_EVENT_TYPES.paymentLinkSent,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: intent.id,
    description: "Agent tenant processing fee payment initialized.",
    metadata: {
      audit_subtype: "agent_tenant_processing_fee_initialized",
      agent_id: agentSource.agentId,
      agent_property_listing_id: agentSource.agentPropertyListingId,
      paystack_reference: intent.paystack_reference,
      processing_fee_amount: intent.processing_fee_amount,
      agent_share_amount: intent.agent_share_amount,
      tenuro_share_amount: intent.tenuro_share_amount,
      split_code: intent.paystack_split_code,
    },
  });

  return {
    required: true as const,
    status: "initialized" as const,
    authorizationUrl: intent.authorization_url,
    reference: intent.paystack_reference,
    processingFeeAmount: Number(intent.processing_fee_amount),
    agentShareAmount: Number(intent.agent_share_amount),
    tenuroShareAmount: Number(intent.tenuro_share_amount),
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
    eventType: AUDIT_EVENT_TYPES.gatewayPaymentVerified,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: paidIntent.id,
    description: "Agent tenant processing fee payment confirmed.",
    metadata: {
      audit_subtype: "agent_tenant_processing_fee_paid",
      agent_id: paidIntent.agent_id,
      agent_property_listing_id: paidIntent.agent_property_listing_id,
      paystack_reference: paidIntent.paystack_reference,
      processing_fee_amount: paidIntent.processing_fee_amount,
      agent_share_amount: paidIntent.agent_share_amount,
      tenuro_share_amount: paidIntent.tenuro_share_amount,
      paid_at: paidIntent.paid_at,
    },
  });

  return paidIntent;
}
