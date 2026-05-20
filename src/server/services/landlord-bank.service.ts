import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  createLandlordPaystackAccount,
  deactivateLandlordPaystackAccounts,
  getActiveLandlordPaystackAccount,
} from "@/server/repositories/landlord-paystack.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SetupLandlordBankAccountInput } from "@/server/validators/payment.schema";
import { requireLandlord } from "./auth.service";
import {
  createLandlordSubaccount,
  getSupportedBanks,
  verifyBankAccount,
} from "./paystack.service";

function buildPayoutVerificationAuditMetadata(params: {
  accountId: string;
  accountOwnerRole: "landlord";
  bankName: string;
  accountName: string;
  accountNumber: string;
  paystackSubaccountCode: string;
  verificationStatus: string;
}) {
  return {
    account_owner_role: params.accountOwnerRole,
    payout_account_id: params.accountId,
    bank_name: params.bankName,
    account_name: params.accountName,
    account_number_last4: params.accountNumber.slice(-4),
    paystack_subaccount_code: params.paystackSubaccountCode,
    verification_status: params.verificationStatus,
    awaiting_paystack_verification: true,
    internal_notification: {
      type: "paystack_payout_verification_required",
      status: "pending",
      channel: "audit_log",
    },
  };
}

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
    landlordPhoneNumber: landlord.phoneNumber ?? "",
    landlordEmail: landlord.email,
  });

  await deactivateLandlordPaystackAccounts(supabase, landlord.id);

  const paystackAccount = await createLandlordPaystackAccount(supabase, {
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

  const auditMetadata = buildPayoutVerificationAuditMetadata({
    accountId: paystackAccount.id,
    accountOwnerRole: "landlord",
    bankName: paystackAccount.bank_name,
    accountName: paystackAccount.account_name,
    accountNumber: paystackAccount.account_number,
    paystackSubaccountCode: paystackAccount.paystack_subaccount_code,
    verificationStatus: paystackAccount.verification_status,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.payoutAccountCreated,
    entityType: AUDIT_ENTITY_TYPES.bankAccount,
    entityId: paystackAccount.id,
    description: `Landlord payout account created: ${paystackAccount.bank_name}`,
    metadata: auditMetadata,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.payoutVerificationPending,
    entityType: AUDIT_ENTITY_TYPES.bankAccount,
    entityId: paystackAccount.id,
    description:
      "Landlord payout account is awaiting manual Paystack verification.",
    metadata: auditMetadata,
  });

  return paystackAccount;
}
