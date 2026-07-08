import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaystackVerificationStatus } from "@/server/types/paystack.types";

export type ManagerPaystackAccountRow = {
  id: string;
  organization_id: string;
  business_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  currency_code: "NGN";
  is_active: boolean;
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ManagerPaystackAccountWithOwner = ManagerPaystackAccountRow & {
  manager_organizations: {
    id: string;
    owner_profile_id: string;
    organization_name: string;
    organization_email: string | null;
    organization_phone: string | null;
  } | null;
};

export type ManagerLandlordPaystackAccountRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  business_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  currency_code: "NGN";
  is_active: boolean;
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const MANAGER_PAYSTACK_ACCOUNT_SELECT = `
  id,
  organization_id,
  business_name,
  contact_name,
  contact_phone,
  contact_email,
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
  metadata,
  created_at,
  updated_at
`;

const MANAGER_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT = `
  ${MANAGER_PAYSTACK_ACCOUNT_SELECT},
  manager_organizations (
    id,
    owner_profile_id,
    organization_name,
    organization_email,
    organization_phone
  )
`;

const MANAGER_LANDLORD_PAYSTACK_ACCOUNT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  business_name,
  contact_name,
  contact_phone,
  contact_email,
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
  metadata,
  created_at,
  updated_at
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

export async function getActiveManagerPaystackAccount(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_paystack_accounts")
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle<ManagerPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerPaystackAccountById(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("manager_paystack_accounts")
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle<ManagerPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerPaystackAccounts(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_paystack_accounts")
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .returns<ManagerPaystackAccountRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerPaystackAccountsByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("manager_paystack_accounts")
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<ManagerPaystackAccountRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerPaystackAccountsWithOwnersByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("manager_paystack_accounts")
    .select(MANAGER_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } =
    await query.returns<ManagerPaystackAccountWithOwner[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateActiveManagerPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    expectedUpdatedAt: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .eq("is_active", true)
    .eq("updated_at", params.expectedUpdatedAt)
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .maybeSingle<ManagerPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerPaystackAccount(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    businessName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paystackSubaccountCode: string;
    paystackSubaccountId: number | null;
    metadata: Record<string, unknown>;
  },
) {
  const { error: deactivateError } = await supabase
    .from("manager_paystack_accounts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("is_active", true);

  if (deactivateError) {
    throw deactivateError;
  }

  const { data, error } = await supabase
    .from("manager_paystack_accounts")
    .insert({
      organization_id: params.organizationId,
      business_name: params.businessName,
      contact_name: params.contactName,
      contact_phone: params.contactPhone,
      contact_email: params.contactEmail,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      currency_code: "NGN",
      is_active: true,
      verification_status: "unverified",
      verified_at: null,
      metadata: params.metadata,
    })
    .select(MANAGER_PAYSTACK_ACCOUNT_SELECT)
    .single<ManagerPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveManagerLandlordPaystackAccount(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_landlord_paystack_accounts")
    .select(MANAGER_LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .eq("is_active", true)
    .maybeSingle<ManagerLandlordPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerLandlordPaystackAccounts(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_landlord_paystack_accounts")
    .select(MANAGER_LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .returns<ManagerLandlordPaystackAccountRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerLandlordPaystackAccount(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    businessName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paystackSubaccountCode: string;
    paystackSubaccountId: number | null;
    metadata: Record<string, unknown>;
  },
) {
  const { error: deactivateError } = await supabase
    .from("manager_landlord_paystack_accounts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .eq("is_active", true);

  if (deactivateError) {
    throw deactivateError;
  }

  const { data, error } = await supabase
    .from("manager_landlord_paystack_accounts")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      business_name: params.businessName,
      contact_name: params.contactName,
      contact_phone: params.contactPhone,
      contact_email: params.contactEmail,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      currency_code: "NGN",
      is_active: true,
      verification_status: "unverified",
      verified_at: null,
      metadata: params.metadata,
    })
    .select(MANAGER_LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .single<ManagerLandlordPaystackAccountRow>();

  if (error) {
    throw error;
  }

  return data;
}
