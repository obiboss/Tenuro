import "server-only";

import { isAgentSourcedTenant } from "@/server/constants/onboarding-lifecycle";
import { AppError } from "@/server/errors/app-error";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";
import {
  resolveAgentTenantProcessingFeeForOnboarding,
  verifyAgentTenantProcessingFeeReference,
} from "@/server/services/agent-processing-fee.service";
import {
  resolveLandlordTenantProcessingFeeForOnboarding,
  verifyLandlordTenantProcessingFeeReference,
} from "@/server/services/landlord-processing-fee.service";

function isProcessingFeeNotFoundError(error: unknown) {
  return (
    error instanceof AppError &&
    (error.code === "AGENT_PROCESSING_FEE_NOT_FOUND" ||
      error.code === "LANDLORD_PROCESSING_FEE_NOT_FOUND")
  );
}

export async function resolveTenantProcessingFeeForOnboarding(params: {
  tenant: TenantOnboardingResolvedRecord;
  token: string;
}) {
  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: params.tenant.agent_property_listing_id,
    invitedByAgentId: params.tenant.invited_by_agent_id,
  });

  if (agentSourced) {
    return resolveAgentTenantProcessingFeeForOnboarding(params);
  }

  return resolveLandlordTenantProcessingFeeForOnboarding(params);
}

export async function verifyTenantProcessingFeeReference(reference: string) {
  try {
    return await verifyAgentTenantProcessingFeeReference(reference);
  } catch (error) {
    if (!isProcessingFeeNotFoundError(error)) {
      throw error;
    }
  }

  return verifyLandlordTenantProcessingFeeReference(reference);
}
