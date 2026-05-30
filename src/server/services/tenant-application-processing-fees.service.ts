import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  createTenantApplicationProcessingFeeIntent,
  getLatestTenantApplicationProcessingFeeIntent,
  getTenantApplicationProcessingFeeIntentByReference,
  markTenantApplicationProcessingFeeIntentFailed,
  markTenantApplicationProcessingFeeIntentPaid,
} from "@/server/repositories/tenant-application-processing-fees.repository";
import {
  createProcessingFeeAccess,
  getActiveProcessingFeeAccess,
  getPropertyApplicationById,
  updatePropertyApplicationStatus,
} from "@/server/repositories/tenant-applications.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { queueLandlordInAppNotification } from "@/server/services/notification-queue.service";
import {
  convertNairaToKobo,
  initializeStandardPaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";
import {
  getProcessingFeeValidUntil,
  PROCESSING_FEE_VALIDITY_DAYS,
} from "@/server/services/tenant-applications.service";

const DEFAULT_PROCESSING_FEE_NAIRA = 15000;
const AGENT_PROCESSING_FEE_SHARE_NAIRA = 10000;
const FALLBACK_PAYSTACK_EMAIL_DOMAIN = "boldverseproperty.com";

type TenantApplicationProcessingFeeBreakdown = {
  processingFeeAmount: number;
  platformShareAmount: number;
  agentShareAmount: number;
  totalAmount: number;
  splitMode: "agent_sourced";
};

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function getTenantApplicationProcessingFeeAmount() {
  const configuredAmount = Number(
    process.env.BOPA_TENANT_APPLICATION_PROCESSING_FEE_NAIRA ??
      process.env.TENURO_TENANT_APPLICATION_PROCESSING_FEE_NAIRA ??
      DEFAULT_PROCESSING_FEE_NAIRA,
  );

  if (!Number.isFinite(configuredAmount) || configuredAmount <= 0) {
    throw new AppError(
      "PROCESSING_FEE_AMOUNT_INVALID",
      "Tenant processing fee amount is not configured correctly.",
      500,
    );
  }

  return Math.round(configuredAmount);
}

function hasAgentSource(agentId: string | null) {
  return typeof agentId === "string" && agentId.trim().length > 0;
}

function getTenantApplicationProcessingFeeBreakdown(): TenantApplicationProcessingFeeBreakdown {
  const processingFeeAmount = getTenantApplicationProcessingFeeAmount();

  if (AGENT_PROCESSING_FEE_SHARE_NAIRA >= processingFeeAmount) {
    throw new AppError(
      "PROCESSING_FEE_SPLIT_INVALID",
      "Agent processing fee share cannot be equal to or higher than the tenant processing fee.",
      500,
    );
  }

  return {
    processingFeeAmount,
    platformShareAmount: processingFeeAmount - AGENT_PROCESSING_FEE_SHARE_NAIRA,
    agentShareAmount: AGENT_PROCESSING_FEE_SHARE_NAIRA,
    totalAmount: processingFeeAmount,
    splitMode: "agent_sourced",
  };
}

function createProcessingFeeReference() {
  return `bopa_app_fee_${crypto.randomUUID().replaceAll("-", "")}`;
}

function createIdempotencyKey(applicationId: string) {
  return `tenant_application_processing_fee:${applicationId}`;
}

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidPaystackEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function createFallbackPaystackEmail(propertyApplicationId: string) {
  return `tenant-application-${propertyApplicationId}@${FALLBACK_PAYSTACK_EMAIL_DOMAIN}`;
}

function getTenantEmail(params: {
  propertyApplicationId: string;
  metadata: Record<string, unknown>;
}) {
  const email = params.metadata.tenant_email;

  if (typeof email === "string" && email.trim()) {
    const normalizedEmail = normaliseEmail(email);

    if (isValidPaystackEmail(normalizedEmail)) {
      return normalizedEmail;
    }
  }

  return createFallbackPaystackEmail(params.propertyApplicationId);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mapPaystackStatusToProcessingFeeStatus(status: string) {
  if (status === "failed") {
    return "failed" as const;
  }

  if (status === "abandoned") {
    return "abandoned" as const;
  }

  return "failed" as const;
}

function assertProcessingFeeAmountMatches(params: {
  verifiedAmountKobo: number;
  expectedAmountNaira: number;
}) {
  const expectedKobo = convertNairaToKobo(params.expectedAmountNaira);
  const difference = Math.abs(params.verifiedAmountKobo - expectedKobo);

  if (difference >= 1) {
    throw new AppError(
      "TENANT_APPLICATION_PROCESSING_FEE_AMOUNT_MISMATCH",
      "Processing fee amount does not match the initialized payment.",
      400,
    );
  }
}

async function writeProcessingFeeConfirmedAudit(params: {
  landlordId: string | null;
  propertyApplicationId: string;
  tenantKycProfileId: string;
  agentPropertyListingId: string;
  agentId: string | null;
  paystackReference: string;
  amountPaid: number;
  platformShareAmount: number;
  agentShareAmount: number;
  currencyCode: string;
  validUntil: string;
  splitMode: TenantApplicationProcessingFeeBreakdown["splitMode"];
}) {
  if (!params.landlordId) {
    return;
  }

  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: null,
    unitId: null,
    propertyId: null,
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.system,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationFeeConfirmed,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: params.propertyApplicationId,
    description:
      "Agent-sourced tenant application processing fee was confirmed and the application was submitted for landlord review.",
    metadata: {
      tenant_kyc_profile_id: params.tenantKycProfileId,
      agent_property_listing_id: params.agentPropertyListingId,
      agent_id: params.agentId,
      paystack_reference: params.paystackReference,
      amount_paid: params.amountPaid,
      platform_share_amount: params.platformShareAmount,
      agent_share_amount: params.agentShareAmount,
      split_mode: params.splitMode,
      currency_code: params.currencyCode,
      valid_until: params.validUntil,
      validity_days: PROCESSING_FEE_VALIDITY_DAYS,
    },
  });
}

async function writeDirectApplicationSubmittedAudit(params: {
  landlordId: string | null;
  propertyApplicationId: string;
  tenantKycProfileId: string;
  acquisitionContextKey: string;
}) {
  if (!params.landlordId) {
    return;
  }

  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: null,
    unitId: null,
    propertyId: null,
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.system,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationFeeConfirmed,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: params.propertyApplicationId,
    description:
      "Direct landlord tenant application was submitted for landlord review without a processing fee.",
    metadata: {
      tenant_kyc_profile_id: params.tenantKycProfileId,
      acquisition_context_key: params.acquisitionContextKey,
      processing_fee_required: false,
      reason: "direct_landlord_tenant_no_processing_fee",
    },
  });
}

async function notifyLandlordApplicationReady(params: {
  landlordId: string | null;
  propertyApplicationId: string;
  metadata: Record<string, unknown>;
}) {
  if (!params.landlordId) {
    return;
  }

  const tenantName = getMetadataString(
    params.metadata,
    "tenant_name",
    "A prospective tenant",
  );
  const propertyName = getMetadataString(
    params.metadata,
    "property_name",
    "your property",
  );
  const unitIdentifier = getMetadataString(
    params.metadata,
    "unit_identifier",
    "the selected unit",
  );

  await queueLandlordInAppNotification({
    landlordId: params.landlordId,
    messageBody: `${tenantName}'s application for ${propertyName}, ${unitIdentifier} is ready for your review.`,
  });
}

export async function initializeTenantApplicationProcessingFee(
  propertyApplicationId: string,
) {
  const supabase = createSupabaseAdminClient();
  const application = await getPropertyApplicationById(
    supabase,
    propertyApplicationId,
  );

  if (application.status !== "fee_pending") {
    throw new AppError(
      "APPLICATION_NOT_AWAITING_FEE",
      "This application is not awaiting processing fee payment.",
      400,
    );
  }

  if (!hasAgentSource(application.agent_id)) {
    await updatePropertyApplicationStatus(supabase, {
      applicationId: application.id,
      status: "submitted_for_landlord_review",
      processingFeeAccessId: null,
    });

    await notifyLandlordApplicationReady({
      landlordId: application.landlord_id,
      propertyApplicationId: application.id,
      metadata: application.metadata,
    });

    await writeDirectApplicationSubmittedAudit({
      landlordId: application.landlord_id,
      propertyApplicationId: application.id,
      tenantKycProfileId: application.tenant_kyc_profile_id,
      acquisitionContextKey: application.acquisition_context_key,
    });

    throw new AppError(
      "PROCESSING_FEE_NOT_REQUIRED",
      "No processing fee is required for direct landlord applications.",
      400,
    );
  }

  const activeFeeAccess = await getActiveProcessingFeeAccess(supabase, {
    tenantKycProfileId: application.tenant_kyc_profile_id,
    acquisitionContextKey: application.acquisition_context_key,
    nowIso: new Date().toISOString(),
  });

  if (activeFeeAccess) {
    await updatePropertyApplicationStatus(supabase, {
      applicationId: application.id,
      status: "submitted_for_landlord_review",
      processingFeeAccessId: activeFeeAccess.id,
    });

    await notifyLandlordApplicationReady({
      landlordId: application.landlord_id,
      propertyApplicationId: application.id,
      metadata: application.metadata,
    });

    throw new AppError(
      "PROCESSING_FEE_ALREADY_VALID",
      "This tenant already has a valid processing fee for this agent/landlord context.",
      400,
    );
  }

  const existingIntent = await getLatestTenantApplicationProcessingFeeIntent(
    supabase,
    propertyApplicationId,
  );

  if (existingIntent?.status === "initialized") {
    return {
      intent: existingIntent,
      authorizationUrl: existingIntent.authorization_url,
    };
  }

  const feeBreakdown = getTenantApplicationProcessingFeeBreakdown();
  const reference = createProcessingFeeReference();
  const callbackUrl = `${getAppBaseUrl()}/agent-listings/application-fee/callback?reference=${encodeURIComponent(
    reference,
  )}`;

  const initializedTransaction = await initializeStandardPaystackTransaction({
    email: getTenantEmail({
      propertyApplicationId: application.id,
      metadata: application.metadata,
    }),
    amountKobo: convertNairaToKobo(feeBreakdown.totalAmount),
    reference,
    callbackUrl,
    currencyCode: "NGN",
    metadata: {
      payment_type: "tenant_application_processing_fee",
      property_application_id: application.id,
      tenant_kyc_profile_id: application.tenant_kyc_profile_id,
      agent_property_listing_id: application.agent_property_listing_id,
      agent_id: application.agent_id,
      landlord_id: application.landlord_id,
      landlord_phone_number: application.landlord_phone_number,
      acquisition_context_key: application.acquisition_context_key,
      processing_fee_amount_naira: feeBreakdown.processingFeeAmount,
      platform_share_amount_naira: feeBreakdown.platformShareAmount,
      agent_share_amount_naira: feeBreakdown.agentShareAmount,
      split_mode: feeBreakdown.splitMode,
      expected_amount_naira: feeBreakdown.totalAmount,
      currency_code: "NGN",
    },
  });

  const intent = await createTenantApplicationProcessingFeeIntent(supabase, {
    propertyApplicationId: application.id,
    tenantKycProfileId: application.tenant_kyc_profile_id,
    agentPropertyListingId: application.agent_property_listing_id,
    agentId: application.agent_id,
    landlordId: application.landlord_id,
    landlordPhoneNumber: application.landlord_phone_number,
    acquisitionContextKey: application.acquisition_context_key,
    paystackReference: reference,
    paystackAccessCode: initializedTransaction.access_code,
    authorizationUrl: initializedTransaction.authorization_url,
    processingFeeAmount: feeBreakdown.processingFeeAmount,
    platformShareAmount: feeBreakdown.platformShareAmount,
    agentShareAmount: feeBreakdown.agentShareAmount,
    totalAmount: feeBreakdown.totalAmount,
    currencyCode: "NGN",
    idempotencyKey: createIdempotencyKey(application.id),
    metadata: {
      payment_type: "tenant_application_processing_fee",
      property_application_id: application.id,
      tenant_kyc_profile_id: application.tenant_kyc_profile_id,
      acquisition_context_key: application.acquisition_context_key,
      processing_fee_amount_naira: feeBreakdown.processingFeeAmount,
      platform_share_amount_naira: feeBreakdown.platformShareAmount,
      agent_share_amount_naira: feeBreakdown.agentShareAmount,
      split_mode: feeBreakdown.splitMode,
      total_amount_naira: feeBreakdown.totalAmount,
      validity_days: PROCESSING_FEE_VALIDITY_DAYS,
    },
  });

  return {
    intent,
    authorizationUrl: intent.authorization_url,
  };
}

export async function verifyTenantApplicationProcessingFeeReference(
  reference: string,
) {
  const supabase = createSupabaseAdminClient();

  const intent = await getTenantApplicationProcessingFeeIntentByReference(
    supabase,
    reference,
  );

  if (!intent) {
    throw new AppError(
      "TENANT_APPLICATION_PROCESSING_FEE_NOT_FOUND",
      "Tenant application processing fee reference was not found.",
      404,
    );
  }

  const verifiedTransaction = await verifyPaystackTransaction(reference);
  const verifiedPayload = toRecord(verifiedTransaction);

  if (verifiedTransaction.reference !== intent.paystack_reference) {
    throw new AppError(
      "TENANT_APPLICATION_PROCESSING_FEE_REFERENCE_MISMATCH",
      "Processing fee reference does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.currency !== intent.currency_code) {
    throw new AppError(
      "TENANT_APPLICATION_PROCESSING_FEE_CURRENCY_MISMATCH",
      "Processing fee currency does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.status !== "success") {
    await markTenantApplicationProcessingFeeIntentFailed(supabase, {
      intentId: intent.id,
      status: mapPaystackStatusToProcessingFeeStatus(
        verifiedTransaction.status,
      ),
      failureReason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
    });

    throw new AppError(
      "TENANT_APPLICATION_PROCESSING_FEE_NOT_SUCCESSFUL",
      "Processing fee payment was not successful.",
      400,
    );
  }

  assertProcessingFeeAmountMatches({
    verifiedAmountKobo: verifiedTransaction.amount,
    expectedAmountNaira: intent.total_amount,
  });

  const paidAt = verifiedTransaction.paid_at ?? new Date().toISOString();

  const paidIntent = await markTenantApplicationProcessingFeeIntentPaid(
    supabase,
    {
      intentId: intent.id,
      paidAt,
      verifiedPayload,
    },
  );

  const existingAccess = await getActiveProcessingFeeAccess(supabase, {
    tenantKycProfileId: paidIntent.tenant_kyc_profile_id,
    acquisitionContextKey: paidIntent.acquisition_context_key,
    nowIso: new Date().toISOString(),
  });

  const validUntil = getProcessingFeeValidUntil(new Date(paidAt)).toISOString();

  const feeAccess =
    existingAccess ??
    (await createProcessingFeeAccess(supabase, {
      tenantKycProfileId: paidIntent.tenant_kyc_profile_id,
      agentId: paidIntent.agent_id,
      landlordId: paidIntent.landlord_id,
      landlordPhoneNumber: paidIntent.landlord_phone_number,
      acquisitionContextKey: paidIntent.acquisition_context_key,
      sourceIntentTable: "tenant_application_processing_fee_intents",
      sourceIntentId: paidIntent.id,
      amountPaid: paidIntent.total_amount,
      currencyCode: paidIntent.currency_code,
      paidAt,
      validUntil,
      metadata: {
        property_application_id: paidIntent.property_application_id,
        agent_property_listing_id: paidIntent.agent_property_listing_id,
        paystack_reference: paidIntent.paystack_reference,
        processing_fee_amount_naira: paidIntent.processing_fee_amount,
        platform_share_amount_naira: paidIntent.platform_share_amount,
        agent_share_amount_naira: paidIntent.agent_share_amount,
        total_amount_naira: paidIntent.total_amount,
        validity_days: PROCESSING_FEE_VALIDITY_DAYS,
      },
    }));

  const application = await getPropertyApplicationById(
    supabase,
    paidIntent.property_application_id,
  );

  await updatePropertyApplicationStatus(supabase, {
    applicationId: paidIntent.property_application_id,
    status: "submitted_for_landlord_review",
    processingFeeAccessId: feeAccess.id,
  });

  await notifyLandlordApplicationReady({
    landlordId: paidIntent.landlord_id,
    propertyApplicationId: paidIntent.property_application_id,
    metadata: application.metadata,
  });

  await writeProcessingFeeConfirmedAudit({
    landlordId: paidIntent.landlord_id,
    propertyApplicationId: paidIntent.property_application_id,
    tenantKycProfileId: paidIntent.tenant_kyc_profile_id,
    agentPropertyListingId: paidIntent.agent_property_listing_id,
    agentId: paidIntent.agent_id,
    paystackReference: paidIntent.paystack_reference,
    amountPaid: paidIntent.total_amount,
    platformShareAmount: paidIntent.platform_share_amount,
    agentShareAmount: paidIntent.agent_share_amount,
    currencyCode: paidIntent.currency_code,
    validUntil: feeAccess.valid_until,
    splitMode: "agent_sourced",
  });

  return paidIntent;
}
