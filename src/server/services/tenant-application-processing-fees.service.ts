import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createTenantApplicationProcessingFeeIntent,
  getLatestTenantApplicationProcessingFeeIntent,
} from "@/server/repositories/tenant-application-processing-fees.repository";
import {
  getActiveProcessingFeeAccess,
  getPropertyApplicationById,
} from "@/server/repositories/tenant-applications.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  convertNairaToKobo,
  initializeStandardPaystackTransaction,
} from "@/server/services/paystack.service";

const DEFAULT_PROCESSING_FEE_NAIRA = 5000;

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

function createProcessingFeeReference() {
  return `bopa_app_fee_${crypto.randomUUID().replaceAll("-", "")}`;
}

function createIdempotencyKey(applicationId: string) {
  return `tenant_application_processing_fee:${applicationId}`;
}

function getTenantEmail(metadata: Record<string, unknown>) {
  const email = metadata.tenant_email;

  if (typeof email === "string" && email.trim()) {
    return email.trim().toLowerCase();
  }

  return "tenant@bopa.local";
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

  const activeFeeAccess = await getActiveProcessingFeeAccess(supabase, {
    tenantKycProfileId: application.tenant_kyc_profile_id,
    acquisitionContextKey: application.acquisition_context_key,
    nowIso: new Date().toISOString(),
  });

  if (activeFeeAccess) {
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

  const processingFeeAmount = getTenantApplicationProcessingFeeAmount();
  const reference = createProcessingFeeReference();
  const callbackUrl = `${getAppBaseUrl()}/agent-listings/application-fee/callback?reference=${encodeURIComponent(
    reference,
  )}`;

  const initializedTransaction = await initializeStandardPaystackTransaction({
    email: getTenantEmail(application.metadata),
    amountKobo: convertNairaToKobo(processingFeeAmount),
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
      expected_amount_naira: processingFeeAmount,
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
    processingFeeAmount,
    platformShareAmount: processingFeeAmount,
    agentShareAmount: 0,
    totalAmount: processingFeeAmount,
    currencyCode: "NGN",
    idempotencyKey: createIdempotencyKey(application.id),
    metadata: {
      property_application_id: application.id,
      tenant_kyc_profile_id: application.tenant_kyc_profile_id,
      acquisition_context_key: application.acquisition_context_key,
    },
  });

  return {
    intent,
    authorizationUrl: intent.authorization_url,
  };
}
