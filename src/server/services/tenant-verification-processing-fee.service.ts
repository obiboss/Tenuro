import "server-only";

import { isAgentSourcedTenant } from "@/server/constants/onboarding-lifecycle";
import { AppError, isAppError } from "@/server/errors/app-error";
import { errorResult } from "@/server/errors/result";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";
import {
  resolveAgentTenantProcessingFeeForOnboarding,
  verifyAgentTenantProcessingFeeReference,
} from "@/server/services/agent-processing-fee.service";
import {
  resolveLandlordTenantProcessingFeeForOnboarding,
  verifyLandlordTenantProcessingFeeReference,
} from "@/server/services/landlord-processing-fee.service";
import {
  getAgentProcessingFeeConfiguration,
  getLandlordProcessingFeeConfiguration,
} from "@/server/services/platform-payment-settings.service";

const PROCESSING_FEE_CURRENCY = "NGN";

function isProcessingFeeNotFoundError(error: unknown) {
  return (
    error instanceof AppError &&
    (error.code === "AGENT_PROCESSING_FEE_NOT_FOUND" ||
      error.code === "LANDLORD_PROCESSING_FEE_NOT_FOUND")
  );
}

export function getFriendlyProcessingFeeInitErrorMessage(error: unknown) {
  if (isAppError(error)) {
    if (
      error.code === "PAYOUT_ACCOUNT_PENDING_VERIFICATION" ||
      error.code === "AGENT_PAYOUT_ACCOUNT_PENDING_VERIFICATION"
    ) {
      return "Online payment is not ready yet because the payout account is still pending verification. Your application has been saved. Please ask your landlord or agent to complete payout verification, then reopen this link.";
    }

    if (
      error.code === "BANK_ACCOUNT_REQUIRED" ||
      error.code === "AGENT_BANK_ACCOUNT_REQUIRED"
    ) {
      return "Online payment is not ready yet because a payout account has not been connected. Your application has been saved. Please ask your landlord or agent to connect a payout account, then reopen this link.";
    }

    if (
      error.code === "PAYOUT_ACCOUNT_VERIFICATION_FAILED" ||
      error.code === "AGENT_PAYOUT_ACCOUNT_VERIFICATION_FAILED"
    ) {
      return "Online payment is unavailable because payout verification failed. Your application has been saved. Please ask your landlord or agent to update their payout details, then reopen this link.";
    }

    if (error.code === "PAYSTACK_REQUEST_FAILED") {
      const paystackMessage = error.userMessage.toLowerCase();

      if (paystackMessage.includes("subaccount")) {
        return "Online payment is temporarily unavailable because the payout account could not be verified with Paystack. Your application has been saved. Please ask your landlord or agent to reconnect their payout account, then reopen this link.";
      }
    }
  }

  const mappedMessage = errorResult(error).message;

  if (mappedMessage.includes("subaccount")) {
    return "Online payment is temporarily unavailable because the payout account could not be verified with Paystack. Your application has been saved. Please ask your landlord or agent to reconnect their payout account, then reopen this link.";
  }

  return "We could not prepare your verification payment right now, but your application has been saved. Please try again shortly or ask your landlord or agent for help.";
}

async function getFallbackProcessingFeeDisplayState(
  tenant: TenantOnboardingResolvedRecord,
) {
  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  const feeConfiguration = agentSourced
    ? await getAgentProcessingFeeConfiguration()
    : await getLandlordProcessingFeeConfiguration();

  return {
    required: true as const,
    status: "payment_unavailable" as const,
    authorizationUrl: null,
    reference: null,
    processingFeeAmount: feeConfiguration.totalAmount,
    currencyCode: PROCESSING_FEE_CURRENCY,
  };
}

export async function safeResolveTenantProcessingFeeForOnboarding(params: {
  tenant: TenantOnboardingResolvedRecord;
  token: string;
}) {
  try {
    const processingFee = await resolveTenantProcessingFeeForOnboarding(params);

    return {
      processingFee,
      paymentInitError: null,
    };
  } catch (error) {
    return {
      processingFee: await getFallbackProcessingFeeDisplayState(params.tenant),
      paymentInitError: getFriendlyProcessingFeeInitErrorMessage(error),
    };
  }
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
