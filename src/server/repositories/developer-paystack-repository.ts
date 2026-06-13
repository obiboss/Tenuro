import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeveloperPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type { DeveloperPaystackAccount };

export type DeveloperPaystackAccountWithOwner = DeveloperPaystackAccount & {
  developer_account: {
    id: string;
    company_name: string;
    company_email: string | null;
    company_phone: string | null;
    owner_profile_id: string;
    owner_profile: {
      id: string;
      full_name: string;
      email: string | null;
      phone_number: string | null;
    } | null;
  } | null;
};

const DEVELOPER_PAYSTACK_ACCOUNT_SELECT = `
  id,
  developer_account_id,
  business_name,
  bank_code,
  bank_name,
  account_number,
  account_name,
  paystack_subaccount_code,
  paystack_subaccount_id,
  currency_code,
  is_active,
  verification_status,
  verified_at,
  created_at,
  updated_at
`;

const DEVELOPER_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT = `
  ${DEVELOPER_PAYSTACK_ACCOUNT_SELECT},
  developer_account:developer_accounts!developer_paystack_accounts_developer_account_id_fkey (
    id,
    company_name,
    company_email,
    company_phone,
    owner_profile_id,
    owner_profile:profiles!developer_accounts_owner_profile_id_fkey (
      id,
      full_name,
      email,
      phone_number
    )
  )
`;

function buildVerificationStatusUpdate(params: {
  verificationStatus: PaystackVerificationStatus;
  verifiedAt?: string | null;
}) {
  const isVerified = params.verificationStatus === "verified";

  return {
    verification_status: params.verificationStatus,
    verified_at: isVerified
      ? (params.verifiedAt ?? new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

export async function getActiveDeveloperPaystackAccount(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_paystack_accounts")
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .eq("developer_account_id", developerAccountId)
    .eq("is_active", true)
    .maybeSingle<DeveloperPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deactivateDeveloperPaystackAccounts(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { error } = await supabase
    .from("developer_paystack_accounts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("developer_account_id", developerAccountId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }
}

export async function createDeveloperPaystackAccount(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    businessName: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paystackSubaccountCode: string;
    paystackSubaccountId: number | null;
    currencyCode: string;
  },
) {
  await deactivateDeveloperPaystackAccounts(
    supabase,
    params.developerAccountId,
  );

  const { data, error } = await supabase
    .from("developer_paystack_accounts")
    .insert({
      developer_account_id: params.developerAccountId,
      business_name: params.businessName,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      currency_code: params.currencyCode,
      is_active: true,
      verification_status: "unverified",
      verified_at: null,
    })
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .single<DeveloperPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDeveloperPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .single<DeveloperPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateActiveDeveloperPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    expectedUpdatedAt: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .eq("is_active", true)
    .eq("updated_at", params.expectedUpdatedAt)
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .maybeSingle<DeveloperPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPaystackAccountById(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("developer_paystack_accounts")
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle<DeveloperPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPaystackAccountsByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("developer_paystack_accounts")
    .select(DEVELOPER_PAYSTACK_ACCOUNT_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<DeveloperPaystackAccount[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPaystackAccountsWithOwnersByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("developer_paystack_accounts")
    .select(DEVELOPER_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } =
    await query.returns<DeveloperPaystackAccountWithOwner[]>();

  if (error) {
    throw error;
  }

  return data;
}
