import "server-only";

import {
  getAgentPaystackAccountById,
  getAgentPaystackAccountsWithOwnersByVerificationStatus,
  updateActiveAgentPaystackAccountVerificationStatus,
  type AgentPaystackAccountWithOwner,
} from "@/server/repositories/agent-paystack.repository";
import {
  getLandlordPaystackAccountById,
  getLandlordPaystackAccountsWithOwnersByVerificationStatus,
  updateActiveLandlordPaystackAccountVerificationStatus,
  type LandlordPaystackAccountWithOwner,
} from "@/server/repositories/landlord-paystack.repository";
import { AppError } from "@/server/errors/app-error";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  AgentPaystackAccount,
  LandlordPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type PayoutVerificationAccountType = "landlord" | "agent";

export type PlatformAdminPayoutVerificationAccount = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhoneNumber: string | null;
  ownerRole: PayoutVerificationAccountType;
  bankName: string;
  accountName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  paystackSubaccountCode: string;
  isActive: boolean;
  verificationStatus: PaystackVerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAdminPayoutVerificationQueue = {
  pending: PlatformAdminPayoutVerificationAccount[];
  verified: PlatformAdminPayoutVerificationAccount[];
  failed: PlatformAdminPayoutVerificationAccount[];
  totals: {
    pending: number;
    verified: number;
    failed: number;
  };
};

function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim();

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-4)}`;
}

function getOwnerName(owner: { full_name: string } | null) {
  return owner?.full_name?.trim() || "Unknown owner";
}

function mapLandlordAccount(
  account: LandlordPaystackAccountWithOwner,
): PlatformAdminPayoutVerificationAccount {
  return {
    id: account.id,
    ownerId: account.landlord_id,
    ownerName: getOwnerName(account.landlord),
    ownerEmail: account.landlord?.email ?? null,
    ownerPhoneNumber: account.landlord?.phone_number ?? null,
    ownerRole: "landlord",
    bankName: account.bank_name,
    accountName: account.account_name,
    accountNumber: account.account_number,
    maskedAccountNumber: maskAccountNumber(account.account_number),
    paystackSubaccountCode: account.paystack_subaccount_code,
    isActive: account.is_active,
    verificationStatus: account.verification_status,
    verifiedAt: account.verified_at,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

function mapAgentAccount(
  account: AgentPaystackAccountWithOwner,
): PlatformAdminPayoutVerificationAccount {
  return {
    id: account.id,
    ownerId: account.agent_id,
    ownerName: getOwnerName(account.agent),
    ownerEmail: account.agent?.email ?? null,
    ownerPhoneNumber: account.agent?.phone_number ?? null,
    ownerRole: "agent",
    bankName: account.bank_name,
    accountName: account.account_name,
    accountNumber: account.account_number,
    maskedAccountNumber: maskAccountNumber(account.account_number),
    paystackSubaccountCode: account.paystack_subaccount_code,
    isActive: account.is_active,
    verificationStatus: account.verification_status,
    verifiedAt: account.verified_at,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

function sortQueueAccounts(accounts: PlatformAdminPayoutVerificationAccount[]) {
  return [...accounts].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return rightTime - leftTime;
  });
}

function assertActiveAccount(
  account: LandlordPaystackAccount | AgentPaystackAccount | null,
) {
  if (!account) {
    throw new AppError(
      "PAYOUT_ACCOUNT_NOT_FOUND",
      "The payout account could not be found.",
      404,
    );
  }

  if (!account.is_active) {
    throw new AppError(
      "PAYOUT_ACCOUNT_REPLACED",
      "This payout account has been replaced and cannot be verified.",
      409,
    );
  }

  return account;
}

function assertFreshAccount(params: {
  account: LandlordPaystackAccount | AgentPaystackAccount;
  expectedUpdatedAt: string;
  targetStatus: PaystackVerificationStatus;
}) {
  if (params.account.updated_at === params.expectedUpdatedAt) {
    return;
  }

  if (params.account.verification_status === params.targetStatus) {
    return;
  }

  throw new AppError(
    "PAYOUT_ACCOUNT_STALE",
    "This payout account was updated by another admin. Refresh and try again.",
    409,
  );
}

function isAlreadyVerified(
  account: LandlordPaystackAccount | AgentPaystackAccount,
) {
  return (
    account.verification_status === "verified" && Boolean(account.verified_at)
  );
}

async function getCurrentAccount(params: {
  accountType: PayoutVerificationAccountType;
  accountId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (params.accountType === "landlord") {
    return getLandlordPaystackAccountById(supabase, params.accountId);
  }

  return getAgentPaystackAccountById(supabase, params.accountId);
}

export async function getPlatformAdminPayoutVerificationQueue(): Promise<PlatformAdminPayoutVerificationQueue> {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();

  const [
    pendingLandlords,
    pendingAgents,
    verifiedLandlords,
    verifiedAgents,
    failedLandlords,
    failedAgents,
  ] = await Promise.all([
    getLandlordPaystackAccountsWithOwnersByVerificationStatus(
      supabase,
      "unverified",
      { activeOnly: true },
    ),
    getAgentPaystackAccountsWithOwnersByVerificationStatus(
      supabase,
      "unverified",
      { activeOnly: true },
    ),
    getLandlordPaystackAccountsWithOwnersByVerificationStatus(
      supabase,
      "verified",
    ),
    getAgentPaystackAccountsWithOwnersByVerificationStatus(
      supabase,
      "verified",
    ),
    getLandlordPaystackAccountsWithOwnersByVerificationStatus(
      supabase,
      "failed",
    ),
    getAgentPaystackAccountsWithOwnersByVerificationStatus(supabase, "failed"),
  ]);

  const pending = sortQueueAccounts([
    ...pendingLandlords.map(mapLandlordAccount),
    ...pendingAgents.map(mapAgentAccount),
  ]);
  const verified = sortQueueAccounts([
    ...verifiedLandlords.map(mapLandlordAccount),
    ...verifiedAgents.map(mapAgentAccount),
  ]);
  const failed = sortQueueAccounts([
    ...failedLandlords.map(mapLandlordAccount),
    ...failedAgents.map(mapAgentAccount),
  ]);

  return {
    pending,
    verified,
    failed,
    totals: {
      pending: pending.length,
      verified: verified.length,
      failed: failed.length,
    },
  };
}

export async function verifyPlatformAdminPayoutAccount(params: {
  accountType: PayoutVerificationAccountType;
  accountId: string;
  expectedUpdatedAt: string;
}) {
  await requirePlatformAdmin();

  const currentAccount = assertActiveAccount(await getCurrentAccount(params));
  assertFreshAccount({
    account: currentAccount,
    expectedUpdatedAt: params.expectedUpdatedAt,
    targetStatus: "verified",
  });

  if (isAlreadyVerified(currentAccount)) {
    throw new AppError(
      "PAYOUT_ACCOUNT_ALREADY_VERIFIED",
      "This payout account is already verified.",
      409,
    );
  }

  const supabase = createSupabaseAdminClient();
  const verifiedAt = new Date().toISOString();
  const updatedAccount =
    params.accountType === "landlord"
      ? await updateActiveLandlordPaystackAccountVerificationStatus(supabase, {
          accountId: params.accountId,
          expectedUpdatedAt: params.expectedUpdatedAt,
          verificationStatus: "verified",
          verifiedAt,
        })
      : await updateActiveAgentPaystackAccountVerificationStatus(supabase, {
          accountId: params.accountId,
          expectedUpdatedAt: params.expectedUpdatedAt,
          verificationStatus: "verified",
          verifiedAt,
        });

  if (!updatedAccount) {
    const latestAccount = assertActiveAccount(await getCurrentAccount(params));

    if (isAlreadyVerified(latestAccount)) {
      throw new AppError(
        "PAYOUT_ACCOUNT_ALREADY_VERIFIED",
        "This payout account is already verified.",
        409,
      );
    }

    throw new AppError(
      "PAYOUT_ACCOUNT_STALE",
      "This payout account was updated by another admin. Refresh and try again.",
      409,
    );
  }

  return updatedAccount;
}

export async function failPlatformAdminPayoutAccount(params: {
  accountType: PayoutVerificationAccountType;
  accountId: string;
  expectedUpdatedAt: string;
}) {
  await requirePlatformAdmin();

  const currentAccount = assertActiveAccount(await getCurrentAccount(params));
  assertFreshAccount({
    account: currentAccount,
    expectedUpdatedAt: params.expectedUpdatedAt,
    targetStatus: "failed",
  });

  if (currentAccount.verification_status === "verified") {
    throw new AppError(
      "PAYOUT_ACCOUNT_ALREADY_VERIFIED",
      "Verified payout accounts cannot be marked as failed.",
      409,
    );
  }

  if (currentAccount.verification_status === "failed") {
    return currentAccount;
  }

  const supabase = createSupabaseAdminClient();
  const updatedAccount =
    params.accountType === "landlord"
      ? await updateActiveLandlordPaystackAccountVerificationStatus(supabase, {
          accountId: params.accountId,
          expectedUpdatedAt: params.expectedUpdatedAt,
          verificationStatus: "failed",
          verifiedAt: null,
        })
      : await updateActiveAgentPaystackAccountVerificationStatus(supabase, {
          accountId: params.accountId,
          expectedUpdatedAt: params.expectedUpdatedAt,
          verificationStatus: "failed",
          verifiedAt: null,
        });

  if (!updatedAccount) {
    const latestAccount = assertActiveAccount(await getCurrentAccount(params));

    if (latestAccount.verification_status === "verified") {
      throw new AppError(
        "PAYOUT_ACCOUNT_ALREADY_VERIFIED",
        "Verified payout accounts cannot be marked as failed.",
        409,
      );
    }

    if (latestAccount.verification_status === "failed") {
      return latestAccount;
    }

    throw new AppError(
      "PAYOUT_ACCOUNT_STALE",
      "This payout account was updated by another admin. Refresh and try again.",
      409,
    );
  }

  return updatedAccount;
}
