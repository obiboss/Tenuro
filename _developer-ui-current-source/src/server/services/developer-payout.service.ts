import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import {
  createDeveloperPaystackAccount,
  getActiveDeveloperPaystackAccount,
} from "@/server/repositories/developer-paystack-repository";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import {
  createDeveloperSubaccount,
  getSupportedBanks,
  verifyBankAccount,
} from "@/server/services/paystack.service";

export async function getPaystackBanksForDeveloperSetup() {
  const banks = await getSupportedBanks();

  return banks
    .filter((bank) => bank.active && bank.country === "Nigeria")
    .map((bank) => ({
      label: bank.name,
      value: bank.code,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function getDeveloperPayoutAccountState(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
}) {
  const paystackAccount = await getActiveDeveloperPaystackAccount(
    params.supabase,
    params.developerAccountId,
  );

  if (!paystackAccount) {
    return {
      state: "missing" as const,
      paystackAccount: null,
    };
  }

  if (paystackAccount.verification_status === "verified") {
    return {
      state: "verified" as const,
      paystackAccount,
    };
  }

  if (paystackAccount.verification_status === "failed") {
    return {
      state: "failed" as const,
      paystackAccount,
    };
  }

  return {
    state: "unverified" as const,
    paystackAccount,
  };
}

export async function getCurrentDeveloperPayoutAccountState(params: {
  supabase: SupabaseClient;
  developerProfileId: string;
}) {
  const developerAccount = await getDeveloperAccountByOwnerProfileId(
    params.supabase,
    params.developerProfileId,
  );

  if (!developerAccount) {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_FOUND",
      "Developer account was not found.",
      404,
    );
  }

  const payoutState = await getDeveloperPayoutAccountState({
    supabase: params.supabase,
    developerAccountId: developerAccount.id,
  });

  return {
    developerAccount,
    ...payoutState,
  };
}

export async function setupDeveloperPayoutAccount(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  businessName: string;
  contactName: string;
  contactPhoneNumber: string | null;
  contactEmail: string | null;
  bankCode: string;
  bankName: string;
  accountNumber: string;
}) {
  const accountNumber = params.accountNumber.trim();

  if (!/^[0-9]{10}$/.test(accountNumber)) {
    throw new AppError(
      "DEVELOPER_PAYOUT_ACCOUNT_NUMBER_INVALID",
      "Enter a valid 10-digit Nigerian account number.",
      400,
    );
  }

  const bankCode = params.bankCode.trim();
  const bankName = params.bankName.trim();

  if (!bankCode || !bankName) {
    throw new AppError(
      "DEVELOPER_PAYOUT_BANK_REQUIRED",
      "Select a valid payout bank.",
      400,
    );
  }

  const resolvedAccount = await verifyBankAccount({
    accountNumber,
    bankCode,
  });

  if (resolvedAccount.account_number !== accountNumber) {
    throw new AppError(
      "DEVELOPER_BANK_ACCOUNT_MISMATCH",
      "The bank account number could not be confirmed.",
      400,
    );
  }

  const subaccount = await createDeveloperSubaccount({
    businessName: params.businessName,
    bankCode,
    accountNumber,
    developerName: params.contactName,
    developerPhoneNumber: params.contactPhoneNumber,
    developerEmail: params.contactEmail,
  });

  return createDeveloperPaystackAccount(params.supabase, {
    developerAccountId: params.developerAccountId,
    businessName: params.businessName,
    bankCode,
    bankName,
    accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    currencyCode: "NGN",
  });
}

export async function assertDeveloperPayoutAccountVerified(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
}) {
  const paystackAccount = await getActiveDeveloperPaystackAccount(
    params.supabase,
    params.developerAccountId,
  );

  if (!paystackAccount) {
    throw new AppError(
      "DEVELOPER_PAYOUT_ACCOUNT_REQUIRED",
      "Add and verify your payout bank account before sending buyer purchase links.",
      400,
    );
  }

  if (
    paystackAccount.verification_status !== "verified" ||
    !paystackAccount.verified_at
  ) {
    throw new AppError(
      "DEVELOPER_PAYOUT_ACCOUNT_NOT_VERIFIED",
      "Your payout bank account must be verified by BOPA admin before you can send buyer purchase links.",
      400,
    );
  }

  if (!paystackAccount.paystack_subaccount_code.trim()) {
    throw new AppError(
      "DEVELOPER_PAYSTACK_SUBACCOUNT_REQUIRED",
      "Developer payout account is not ready for buyer payments.",
      400,
    );
  }

  return paystackAccount;
}
