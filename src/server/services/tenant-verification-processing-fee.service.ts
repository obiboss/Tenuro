import "server-only";

import { isAgentSourcedTenant } from "@/server/constants/onboarding-lifecycle";
import { AppError, isAppError } from "@/server/errors/app-error";
import { errorResult } from "@/server/errors/result";
import type { TenantOnboardingResolvedRecord } from "@/server/repositories/onboarding.repository";
import {
  resolveAgentTenantProcessingFeeForOnboarding,
  verifyAgentTenantProcessingFeeReference,
} from "@/server/services/agent-processing-fee.service";
import { resolveLandlordTenantProcessingFeeForOnboarding } from "@/server/services/landlord-processing-fee.service";
import { getAgentProcessingFeeConfiguration } from "@/server/services/platform-payment-settings.service";

const PROCESSING_FEE_CURRENCY = "NGN";

function isProcessingFeeNotFoundError(error: unknown) {
  return (
    error instanceof AppError && error.code === "AGENT_PROCESSING_FEE_NOT_FOUND"
  );
}

export function getFriendlyProcessingFeeInitErrorMessage(error: unknown) {
  if (isAppError(error)) {
    if (error.code === "PROCESSING_FEE_NOT_REQUIRED") {
      return "No verification payment is required for this direct landlord application.";
    }

    if (
      error.code === "PAYOUT_ACCOUNT_PENDING_VERIFICATION" ||
      error.code === "AGENT_PAYOUT_ACCOUNT_PENDING_VERIFICATION"
    ) {
      return "Online payment is not ready yet because the payout account is still pending verification. Your application has been saved. Please ask your agent to complete payout verification, then reopen this link.";
    }

    if (
      error.code === "BANK_ACCOUNT_REQUIRED" ||
      error.code === "AGENT_BANK_ACCOUNT_REQUIRED"
    ) {
      return "Online payment is not ready yet because a payout account has not been connected. Your application has been saved. Please ask your agent to connect a payout account, then reopen this link.";
    }

    if (
      error.code === "PAYOUT_ACCOUNT_VERIFICATION_FAILED" ||
      error.code === "AGENT_PAYOUT_ACCOUNT_VERIFICATION_FAILED"
    ) {
      return "Online payment is unavailable because payout verification failed. Your application has been saved. Please ask your agent to update their payout details, then reopen this link.";
    }

    if (error.code === "PAYSTACK_REQUEST_FAILED") {
      const paystackMessage = error.userMessage.toLowerCase();

      if (paystackMessage.includes("subaccount")) {
        return "We could not start online payment with Paystack right now. Your application has been saved. Please ask your agent to confirm their payout account is connected to the same Paystack environment as BOPA, then reopen this link.";
      }
    }
  }

  const mappedMessage = errorResult(error).message;

  if (mappedMessage.toLowerCase().includes("subaccount")) {
    return "We could not start online payment with Paystack right now. Your application has been saved. Please ask your agent to confirm their payout account is connected to the same Paystack environment as BOPA, then reopen this link.";
  }

  return "We could not prepare your verification payment right now, but your application has been saved. Please try again shortly or ask your agent for help.";
}

async function getFallbackProcessingFeeDisplayState(
  tenant: TenantOnboardingResolvedRecord,
) {
  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  if (!agentSourced) {
    return {
      required: false as const,
      status: "not_required" as const,
      authorizationUrl: null,
      reference: null,
      processingFeeAmount: 0,
      currencyCode: PROCESSING_FEE_CURRENCY,
    };
  }

  const feeConfiguration = await getAgentProcessingFeeConfiguration();

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

  throw new AppError(
    "PROCESSING_FEE_NOT_FOUND",
    "Processing fee payment reference was not found.",
    404,
  );
}
