import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LandlordPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type LandlordPaystackAccountWithOwner = LandlordPaystackAccount & {
  landlord: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
  } | null;
};

const LANDLORD_PAYSTACK_ACCOUNT_SELECT = `
  id,
  landlord_id,
  business_name,
  bank_code,
  bank_name,
  account_number,
  account_name,
  paystack_subaccount_code,
  paystack_subaccount_id,
  paystack_split_code,
  paystack_split_id,
  currency_code,
  is_active,
  verification_status,
  verified_at,
  created_at,
  updated_at
`;

const LANDLORD_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT = `
  ${LANDLORD_PAYSTACK_ACCOUNT_SELECT},
  landlord:profiles!landlord_paystack_accounts_landlord_id_fkey (
    id,
    full_name,
    email,
    phone_number
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

export async function getActiveLandlordPaystackAccount(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("landlord_id", landlordId)
    .eq("is_active", true)
    .maybeSingle<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deactivateLandlordPaystackAccounts(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { error } = await supabase
    .from("landlord_paystack_accounts")
    .update({
      is_active: false,
    })
    .eq("landlord_id", landlordId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }
}

export async function createLandlordPaystackAccount(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    businessName: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paystackSubaccountCode: string;
    paystackSubaccountId: number | null;
    paystackSplitCode: string | null;
    paystackSplitId: number | null;
    currencyCode: string;
  },
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .insert({
      landlord_id: params.landlordId,
      business_name: params.businessName,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      paystack_split_code: params.paystackSplitCode,
      paystack_split_id: params.paystackSplitId,
      currency_code: params.currencyCode,
      is_active: true,
    })
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .single<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLandlordPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .single<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateActiveLandlordPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    expectedUpdatedAt: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .eq("is_active", true)
    .eq("updated_at", params.expectedUpdatedAt)
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .maybeSingle<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLandlordPaystackAccountById(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("landlord_paystack_accounts")
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle<LandlordPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markLandlordPaystackAccountVerified(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    verifiedAt?: string;
  },
) {
  return updateLandlordPaystackAccountVerificationStatus(supabase, {
    accountId: params.accountId,
    verificationStatus: "verified",
    verifiedAt: params.verifiedAt,
  });
}

export async function markLandlordPaystackAccountFailed(
  supabase: SupabaseClient,
  accountId: string,
) {
  return updateLandlordPaystackAccountVerificationStatus(supabase, {
    accountId,
    verificationStatus: "failed",
  });
}

export async function getLandlordPaystackAccountsByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("landlord_paystack_accounts")
    .select(LANDLORD_PAYSTACK_ACCOUNT_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<LandlordPaystackAccount[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLandlordPaystackAccountsWithOwnersByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("landlord_paystack_accounts")
    .select(LANDLORD_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } =
    await query.returns<LandlordPaystackAccountWithOwner[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPendingLandlordPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getLandlordPaystackAccountsByVerificationStatus(
    supabase,
    "unverified",
    params,
  );
}

export async function getVerifiedLandlordPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getLandlordPaystackAccountsByVerificationStatus(
    supabase,
    "verified",
    params,
  );
}

export async function getFailedLandlordPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getLandlordPaystackAccountsByVerificationStatus(
    supabase,
    "failed",
    params,
  );
}
