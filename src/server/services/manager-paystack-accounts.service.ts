import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createManagerLandlordPaystackAccount,
  createManagerPaystackAccount,
} from "@/server/repositories/manager-paystack-accounts.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
} from "@/server/repositories/manager.repository";
import {
  createAgentSubaccount,
  createLandlordSubaccount,
  verifyBankAccount,
} from "@/server/services/paystack.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { assertBusinessSubscriptionAccessForProfile } from "@/server/services/business-subscription.service";
import type {
  SaveManagerLandlordPaystackAccountInput,
  SaveManagerOrganizationPaystackAccountInput,
} from "@/server/validators/manager-paystack-accounts.schema";

type ManagerProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

function nullableEmail(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed.toLowerCase() : null;
}

async function getCurrentManagerProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AppError(
      "MANAGER_AUTH_REQUIRED",
      "Please sign in to continue.",
      401,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .maybeSingle<ManagerProfileRow>();

  if (profileError) {
    throw profileError;
  }

  if (!profile || !profile.is_active) {
    throw new AppError(
      "MANAGER_PROFILE_NOT_FOUND",
      "We could not find your active BOPA profile.",
      403,
    );
  }

  if (profile.role !== "manager") {
    throw new AppError(
      "MANAGER_ROLE_REQUIRED",
      "This action is only available to BOPA Manager accounts.",
      403,
    );
  }

  return {
    supabase,
    profile,
  };
}

async function requireManagerOrganization() {
  const { supabase, profile } = await getCurrentManagerProfile();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    profile.id,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create an active BOPA Manager organization before continuing.",
      403,
    );
  }

  await assertBusinessSubscriptionAccessForProfile({
    profileId: profile.id,
    workspaceType: "manager",
  });

  return {
    supabase,
    profile,
    organization,
  };
}

export async function saveManagerOrganizationPaystackAccount(
  input: SaveManagerOrganizationPaystackAccountInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  const resolvedAccount = await verifyBankAccount({
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });

  const subaccount = await createAgentSubaccount({
    businessName: input.businessName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    agentName: input.contactName,
    agentPhoneNumber: input.contactPhone,
    agentEmail: nullableEmail(input.contactEmail),
  });

  return createManagerPaystackAccount(supabase, {
    organizationId: organization.id,
    businessName: input.businessName,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: nullableEmail(input.contactEmail),
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    metadata: {
      source: "bopa_manager_payout_setup",
      paystack_business_name: subaccount.business_name,
    },
  });
}

export async function saveManagerLandlordPaystackAccount(
  input: SaveManagerLandlordPaystackAccountInput,
) {
  const { supabase, organization } = await requireManagerOrganization();

  const landlordClients = await listManagerLandlordClients(
    supabase,
    organization.id,
  );

  const landlordClient =
    landlordClients.find((client) => client.id === input.landlordClientId) ??
    null;

  if (!landlordClient || landlordClient.status !== "active") {
    throw new AppError(
      "MANAGER_LANDLORD_CLIENT_NOT_FOUND",
      "The selected landlord client could not be found.",
      404,
    );
  }

  const resolvedAccount = await verifyBankAccount({
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });

  const subaccount = await createLandlordSubaccount({
    businessName: input.businessName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    landlordName: input.contactName,
    landlordPhoneNumber: input.contactPhone,
    landlordEmail: nullableEmail(input.contactEmail),
  });

  return createManagerLandlordPaystackAccount(supabase, {
    organizationId: organization.id,
    landlordClientId: landlordClient.id,
    businessName: input.businessName,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: nullableEmail(input.contactEmail),
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    metadata: {
      source: "bopa_manager_landlord_payout_setup",
      landlord_client_name: landlordClient.landlord_name,
      paystack_business_name: subaccount.business_name,
    },
  });
}
