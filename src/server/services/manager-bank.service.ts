import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createManagerPaystackAccount,
  getActiveManagerPaystackAccount,
} from "@/server/repositories/manager-paystack-accounts.repository";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManagerWorkspaceOperator } from "@/server/services/auth.service";
import {
  createLandlordSubaccount,
  getSupportedBanks,
  verifyBankAccount,
} from "@/server/services/paystack.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { SetupManagerBankAccountInput } from "@/server/validators/manager-paystack-accounts.schema";

async function requireCurrentManagerOrganization() {
  const manager = await requireManagerWorkspaceOperator();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create an active BOPA Manager organization before setting up payout.",
      403,
    );
  }

  return {
    manager,
    organization,
    supabase,
  };
}

function getManagerContactPhone(params: {
  managerPhoneNumber?: string | null;
  organizationPhone?: string | null;
}) {
  const organizationPhone = params.organizationPhone?.trim();

  if (organizationPhone) {
    return organizationPhone;
  }

  const managerPhone = params.managerPhoneNumber?.trim();

  if (managerPhone) {
    return managerPhone;
  }

  return "Not provided";
}

function getManagerContactEmail(params: {
  managerEmail?: string | null;
  organizationEmail?: string | null;
}) {
  const organizationEmail = params.organizationEmail?.trim();

  if (organizationEmail) {
    return organizationEmail;
  }

  const managerEmail = params.managerEmail?.trim();

  if (managerEmail) {
    return managerEmail;
  }

  return null;
}

export async function getCurrentManagerBankSetup() {
  const { organization, supabase } = await requireCurrentManagerOrganization();

  return getActiveManagerPaystackAccount(supabase, organization.id);
}

export async function getPaystackBanksForManagerSetup() {
  await requireCurrentManagerOrganization();

  const banks = await getSupportedBanks();

  return banks
    .filter((bank) => bank.active && bank.country === "Nigeria")
    .map((bank) => ({
      label: bank.name,
      value: bank.code,
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

export async function setupManagerBankAccount(
  input: SetupManagerBankAccountInput,
) {
  const { manager, organization, supabase } =
    await requireCurrentManagerOrganization();

  const resolvedAccount = await verifyBankAccount({
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });

  if (resolvedAccount.account_number !== input.accountNumber) {
    throw new AppError(
      "MANAGER_BANK_ACCOUNT_MISMATCH",
      "The bank account number could not be confirmed.",
      400,
    );
  }

  const contactPhone = getManagerContactPhone({
    managerPhoneNumber: manager.phoneNumber,
    organizationPhone: organization.organization_phone,
  });

  const contactEmail = getManagerContactEmail({
    managerEmail: manager.email,
    organizationEmail: organization.organization_email,
  });

  const subaccount = await createLandlordSubaccount({
    businessName: input.businessName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    landlordName: organization.organization_name,
    landlordPhoneNumber: contactPhone === "Not provided" ? "" : contactPhone,
    landlordEmail: contactEmail,
  });

  return createManagerPaystackAccount(supabase, {
    organizationId: organization.id,
    businessName: input.businessName,
    contactName: manager.fullName || organization.organization_name,
    contactPhone,
    contactEmail,
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    metadata: {
      source: "bopa_manager_bank_setup",
      account_owner_role: "manager",
      awaiting_paystack_verification: true,
      internal_notification: {
        type: "paystack_payout_verification_required",
        status: "pending",
        channel: "manager_settings",
      },
    },
  });
}
