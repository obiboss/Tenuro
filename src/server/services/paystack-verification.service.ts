import "server-only";

import { AppError } from "@/server/errors/app-error";
import type {
  AgentPaystackAccount,
  LandlordPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type PaystackPayoutVerificationState =
  | "missing"
  | "unverified"
  | "verified"
  | "failed";

export type PaystackPayoutVerificationAudience =
  | "landlord"
  | "agent"
  | "tenant";

export type PaystackPayoutVerificationUiState = {
  state: PaystackPayoutVerificationState;
  isVerified: boolean;
  badgeLabel:
    | "Not Connected"
    | "Pending Verification"
    | "Verified"
    | "Verification Failed";
  badgeTone: "success" | "warning" | "danger" | "neutral";
  guidance: string;
};

type PaystackPayoutAccountVerificationFields = {
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
};

export function getPaystackPayoutVerificationState(
  account: PaystackPayoutAccountVerificationFields | null,
): PaystackPayoutVerificationState {
  if (!account) {
    return "missing";
  }

  if (account.verification_status === "failed") {
    return "failed";
  }

  if (account.verification_status === "verified" && account.verified_at) {
    return "verified";
  }

  return "unverified";
}

export function isPaystackPayoutVerified(
  account: PaystackPayoutAccountVerificationFields | null,
) {
  return getPaystackPayoutVerificationState(account) === "verified";
}

export function getPaystackPayoutVerificationUiState(
  account: PaystackPayoutAccountVerificationFields | null,
  audience: PaystackPayoutVerificationAudience,
): PaystackPayoutVerificationUiState {
  const state = getPaystackPayoutVerificationState(account);

  if (state === "verified") {
    return {
      state,
      isVerified: true,
      badgeLabel: "Verified",
      badgeTone: "success",
      guidance:
        audience === "agent"
          ? "Split payouts are enabled."
          : "Online rent collection is enabled.",
    };
  }

  if (state === "failed") {
    return {
      state,
      isVerified: false,
      badgeLabel: "Verification Failed",
      badgeTone: "danger",
      guidance:
        audience === "tenant"
          ? "Online payment is temporarily unavailable. Please contact your landlord."
          : audience === "agent"
            ? "Your payout account verification failed. Please update your payout details."
            : "Verification failed. Please update your payout details or contact support.",
    };
  }

  if (state === "missing") {
    return {
      state,
      isVerified: false,
      badgeLabel: "Not Connected",
      badgeTone: "neutral",
      guidance:
        audience === "tenant"
          ? "Online payment is temporarily unavailable. Please contact your landlord."
          : audience === "agent"
            ? "Connect your payout account before split payouts can be enabled."
            : "Connect your payout account before online rent payments can be enabled.",
    };
  }

  return {
    state,
    isVerified: false,
    badgeLabel: "Pending Verification",
    badgeTone: "warning",
    guidance:
      audience === "tenant"
        ? "Online payment is temporarily unavailable. Please contact your landlord."
        : audience === "agent"
          ? "Split payouts are disabled until verification is completed."
          : "Online rent payments are disabled until payout verification is approved.",
  };
}

export function getFriendlyPayoutVerificationErrorMessage(code: string) {
  if (code === "BANK_ACCOUNT_REQUIRED") {
    return "Connect and verify your payout account before sending online rent payment links. Manual payment recording is still available.";
  }

  if (code === "PAYOUT_ACCOUNT_PENDING_VERIFICATION") {
    return "Your payout account is pending verification. Online rent payments will be available once verification is approved.";
  }

  if (code === "PAYOUT_ACCOUNT_VERIFICATION_FAILED") {
    return "Your payout account verification failed. Update your payout details or contact support before using online rent payments.";
  }

  if (code === "AGENT_BANK_ACCOUNT_REQUIRED") {
    return "The agent payout account is not ready yet. Split payout actions are unavailable until the agent connects a payout account.";
  }

  if (code === "AGENT_PAYOUT_ACCOUNT_PENDING_VERIFICATION") {
    return "The agent payout account is pending verification. Split payout actions will be available once verification is approved.";
  }

  if (code === "AGENT_PAYOUT_ACCOUNT_VERIFICATION_FAILED") {
    return "The agent payout account verification failed. Split payout actions are unavailable until the payout details are updated.";
  }

  return null;
}

function createLandlordPayoutVerificationError(
  state: Exclude<PaystackPayoutVerificationState, "verified">,
) {
  if (state === "missing") {
    return new AppError(
      "BANK_ACCOUNT_REQUIRED",
      "The landlord payout account is not ready for online rent payment.",
      400,
    );
  }

  if (state === "failed") {
    return new AppError(
      "PAYOUT_ACCOUNT_VERIFICATION_FAILED",
      "Payout account verification failed. Online rent payments are unavailable until the account is reviewed.",
      400,
    );
  }

  return new AppError(
    "PAYOUT_ACCOUNT_PENDING_VERIFICATION",
    "Payout account pending verification. Online rent payments will be available once verified.",
    400,
  );
}

function createAgentPayoutVerificationError(
  state: Exclude<PaystackPayoutVerificationState, "verified">,
) {
  if (state === "missing") {
    return new AppError(
      "AGENT_BANK_ACCOUNT_REQUIRED",
      "The agent payout account is not ready for commission split.",
      400,
    );
  }

  if (state === "failed") {
    return new AppError(
      "AGENT_PAYOUT_ACCOUNT_VERIFICATION_FAILED",
      "Agent payout account verification failed. Commission payments are unavailable until the account is reviewed.",
      400,
    );
  }

  return new AppError(
    "AGENT_PAYOUT_ACCOUNT_PENDING_VERIFICATION",
    "Agent payout account pending verification. Commission payments are unavailable until verified.",
    400,
  );
}

export function assertLandlordPayoutVerified(
  account: LandlordPaystackAccount | null,
): LandlordPaystackAccount {
  const state = getPaystackPayoutVerificationState(account);

  if (state !== "verified") {
    throw createLandlordPayoutVerificationError(state);
  }

  if (!account) {
    throw createLandlordPayoutVerificationError("missing");
  }

  return account;
}

export function assertAgentPayoutVerified(
  account: AgentPaystackAccount | null,
): AgentPaystackAccount {
  const state = getPaystackPayoutVerificationState(account);

  if (state !== "verified") {
    throw createAgentPayoutVerificationError(state);
  }

  if (!account) {
    throw createAgentPayoutVerificationError("missing");
  }

  return account;
}
