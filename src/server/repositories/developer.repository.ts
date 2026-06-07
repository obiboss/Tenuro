import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperAccountStatus =
  | "active"
  | "suspended"
  | "pending_verification";

export type DeveloperSubscriptionPlan = "starter" | "growth" | "pro";

export type DeveloperProfileRole =
  | "developer_owner"
  | "developer_staff"
  | "developer_accountant";

export type DeveloperAccountRow = {
  id: string;
  owner_profile_id: string;
  company_name: string;
  company_phone: string;
  company_email: string | null;
  rc_number: string | null;
  office_address: string | null;
  status: DeveloperAccountStatus;
  subscription_plan: DeveloperSubscriptionPlan;
  created_at: string;
  updated_at: string;
};

export type DeveloperProfileRow = {
  id: string;
  developer_account_id: string;
  profile_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: DeveloperProfileRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DeveloperAccountWithProfile = DeveloperAccountRow & {
  developer_profiles: DeveloperProfileRow[];
};

const DEVELOPER_ACCOUNT_SELECT = `
  id,
  owner_profile_id,
  company_name,
  company_phone,
  company_email,
  rc_number,
  office_address,
  status,
  subscription_plan,
  created_at,
  updated_at
`;

const DEVELOPER_PROFILE_SELECT = `
  id,
  developer_account_id,
  profile_id,
  full_name,
  phone_number,
  email,
  role,
  is_active,
  created_at,
  updated_at
`;

export async function getDeveloperAccountByOwnerProfileId(
  supabase: SupabaseClient,
  ownerProfileId: string,
) {
  const { data, error } = await supabase
    .from("developer_accounts")
    .select(DEVELOPER_ACCOUNT_SELECT)
    .eq("owner_profile_id", ownerProfileId)
    .maybeSingle<DeveloperAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperProfileByProfileId(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("developer_profiles")
    .select(DEVELOPER_PROFILE_SELECT)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle<DeveloperProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperAccountWithOwnerProfile(
  supabase: SupabaseClient,
  params: {
    ownerProfileId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    companyName: string;
    companyPhone: string;
    companyEmail: string | null;
    rcNumber: string | null;
    officeAddress: string | null;
  },
) {
  const { data: account, error: accountError } = await supabase
    .from("developer_accounts")
    .insert({
      owner_profile_id: params.ownerProfileId,
      company_name: params.companyName,
      company_phone: params.companyPhone,
      company_email: params.companyEmail,
      rc_number: params.rcNumber,
      office_address: params.officeAddress,
      status: "active",
      subscription_plan: "starter",
    })
    .select(DEVELOPER_ACCOUNT_SELECT)
    .single<DeveloperAccountRow>();

  if (accountError) {
    throw accountError;
  }

  const { data: profile, error: profileError } = await supabase
    .from("developer_profiles")
    .insert({
      developer_account_id: account.id,
      profile_id: params.ownerProfileId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      role: "developer_owner",
      is_active: true,
    })
    .select(DEVELOPER_PROFILE_SELECT)
    .single<DeveloperProfileRow>();

  if (profileError) {
    throw profileError;
  }

  return {
    account,
    profile,
  };
}
