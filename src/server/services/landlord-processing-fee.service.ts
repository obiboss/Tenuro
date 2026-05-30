import "server-only";

import { TENANT_ONBOARDING_STATUSES } from "@/server/constants/onboarding-lifecycle";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";

const LANDLORD_PROCESSING_CURRENCY = "NGN";

export async function hasPaidLandlordTenantProcessingFee() {
  return true;
}

export async function resolveLandlordTenantProcessingFeeForOnboarding(params: {
  tenant: TenantOnboardingResolvedRecord;
  token: string;
}) {
  void params.token;

  if (
    params.tenant.onboarding_status !==
    TENANT_ONBOARDING_STATUSES.documentsSubmitted
  ) {
    return {
      required: false as const,
      status: "awaiting_kyc" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: 0,
      currencyCode: LANDLORD_PROCESSING_CURRENCY,
    };
  }

  return {
    required: false as const,
    status: "not_required" as const,
    authorizationUrl: null,
    reference: null,
    processingFeeAmount: 0,
    currencyCode: LANDLORD_PROCESSING_CURRENCY,
  };
}

export async function verifyLandlordTenantProcessingFeeReference() {
  return null;
}