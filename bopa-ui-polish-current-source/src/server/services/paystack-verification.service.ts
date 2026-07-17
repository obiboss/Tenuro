import "server-only";

import {
  buildLandlordPaymentGateUiState,
  getLandlordPaymentGateUiStateFromErrorCode,
  type LandlordPaymentGateUiState,
} from "@/lib/landlord-payment-gate";
import type {
  PaystackPayoutVerificationState,
  PayoutVerificationStatusPayload,
} from "@/lib/payout-verification";
import { AppError } from "@/server/errors/app-error";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import {
  getActiveManagerPaystackAccount,
  type ManagerPaystackAccountRow,
} from "@/server/repositories/manager-paystack-accounts.repository";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { getSessionUser } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  AgentPaystackAccount,
  LandlordPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type { LandlordPaymentGateUiState };

export type {
  PaystackPayoutVerificationState,
  PayoutVerificationStatusPayload,
};

export type PaystackPayoutVerificationAudience =
  | "landlord"
  | "agent"
  | "manager"
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

export function buildPayoutVerificationStatusPayload(
  account:
    | (PaystackPayoutAccountVerificationFields & {
        updated_at?: string | null;
      })
    | null,
): PayoutVerificationStatusPayload {
  return {
    state: getPaystackPayoutVerificationState(account),
    verifiedAt: account?.verified_at ?? null,
    updatedAt: account?.updated_at ?? null,
  };
}

export async function getCurrentPayoutVerificationStatus(): Promise<PayoutVerificationStatusPayload> {
  const user = await getSessionUser();

  if (
    !user ||
    (user.role !== "landlord" &&
      user.role !== "agent" &&
      user.role !== "manager")
  ) {
    throw new AppError(
      "UNAUTHORIZED",
      "You must be signed in to check payout verification status.",
      401,
    );
  }

  const supabase = await createSupabaseServerClient();

  if (user.role === "agent") {
    const account = await getActiveAgentPaystackAccount(supabase, user.id);

    return buildPayoutVerificationStatusPayload(account);
  }

  if (user.role === "manager") {
    const organization = await getManagerOrganizationForCurrentUser(
      supabase,
      user.id,
    );

    if (!organization) {
      return buildPayoutVerificationStatusPayload(null);
    }

    const account = await getActiveManagerPaystackAccount(
      supabase,
      organization.id,
    );

    return buildPayoutVerificationStatusPayload(account);
  }

  const account = await getActiveLandlordPaystackAccount(supabase, user.id);

  return buildPayoutVerificationStatusPayload(account);
}

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
          : audience === "manager"
            ? "Manager rent collection is enabled."
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
            : audience === "manager"
              ? "Manager payout account verification failed. Please update your payout details or contact support."
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
            : audience === "manager"
              ? "Connect the manager payout account before rent payment links can be enabled."
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
          : audience === "manager"
            ? "Manager rent payment links are disabled until payout verification is approved. This may take up to 24 hours."
            : "Online rent payments are disabled until payout verification is approved.",
  };
}

export function getFriendlyPayoutVerificationErrorMessage(code: string) {
  const gate = getLandlordPaymentGateUiStateFromErrorCode(code);

  if (gate) {
    return gate.description;
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

  if (code === "MANAGER_PAYOUT_ACCOUNT_REQUIRED") {
    return "The manager payout account is not ready yet. Add and verify the manager bank account before creating rent payment links.";
  }

  if (code === "MANAGER_PAYOUT_ACCOUNT_PENDING_VERIFICATION") {
    return "The manager payout account is pending verification. Rent payment links will work once verification is approved.";
  }

  if (code === "MANAGER_PAYOUT_ACCOUNT_VERIFICATION_FAILED") {
    return "The manager payout account verification failed. Update the payout details before creating rent payment links.";
  }

  return null;
}

export function getLandlordPaymentGateUiState(
  account: PaystackPayoutAccountVerificationFields | null,
): LandlordPaymentGateUiState | null {
  const state = getPaystackPayoutVerificationState(account);

  if (state === "verified") {
    return null;
  }

  return buildLandlordPaymentGateUiState(state);
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

function createManagerPayoutVerificationError(
  state: Exclude<PaystackPayoutVerificationState, "verified">,
) {
  if (state === "missing") {
    return new AppError(
      "MANAGER_PAYOUT_ACCOUNT_REQUIRED",
      "The manager payout account is not ready for rent collection.",
      400,
    );
  }

  if (state === "failed") {
    return new AppError(
      "MANAGER_PAYOUT_ACCOUNT_VERIFICATION_FAILED",
      "Manager payout account verification failed. Rent payment links are unavailable until the account is reviewed.",
      400,
    );
  }

  return new AppError(
    "MANAGER_PAYOUT_ACCOUNT_PENDING_VERIFICATION",
    "Manager payout account pending verification. Rent payment links will be available once verified.",
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

export function assertManagerPayoutVerified(
  account: ManagerPaystackAccountRow | null,
): ManagerPaystackAccountRow {
  const state = getPaystackPayoutVerificationState(account);

  if (state !== "verified") {
    throw createManagerPayoutVerificationError(state);
  }

  if (!account) {
    throw createManagerPayoutVerificationError("missing");
  }

  return account;
}
