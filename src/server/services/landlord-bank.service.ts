import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createLandlordPaystackAccount,
  deactivateLandlordPaystackAccounts,
  getActiveLandlordPaystackAccount,
} from "@/server/repositories/landlord-paystack.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SetupLandlordBankAccountInput } from "@/server/validators/payment.schema";
import { requireLandlord } from "./auth.service";
import {
  createLandlordSubaccount,
  getSupportedBanks,
  verifyBankAccount,
} from "./paystack.service";

export async function getCurrentLandlordBankSetup() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getActiveLandlordPaystackAccount(supabase, landlord.id);
}

export async function getPaystackBanksForSetup() {
  await requireLandlord();

  const banks = await getSupportedBanks();

  return banks
    .filter((bank) => bank.active && bank.country === "Nigeria")
    .map((bank) => ({
      label: bank.name,
      value: bank.code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function setupLandlordBankAccount(
  input: SetupLandlordBankAccountInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const resolvedAccount = await verifyBankAccount({
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });

  if (resolvedAccount.account_number !== input.accountNumber) {
    throw new AppError(
      "BANK_ACCOUNT_MISMATCH",
      "The bank account number could not be confirmed.",
      400,
    );
  }

  const subaccount = await createLandlordSubaccount({
    businessName: input.businessName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    landlordName: landlord.fullName,
    landlordPhoneNumber: landlord.phoneNumber,
    landlordEmail: landlord.email,
  });

  await deactivateLandlordPaystackAccounts(supabase, landlord.id);

  return createLandlordPaystackAccount(supabase, {
    landlordId: landlord.id,
    businessName: input.businessName,
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    paystackSplitCode: null,
    paystackSplitId: null,
    currencyCode: "NGN",
  });
}
