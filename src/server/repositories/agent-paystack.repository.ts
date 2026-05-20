import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentPaystackAccount,
  PaystackVerificationStatus,
} from "@/server/types/paystack.types";

export type { AgentPaystackAccount };

export type AgentPaystackAccountWithOwner = AgentPaystackAccount & {
  agent: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
  } | null;
};

const AGENT_PAYSTACK_ACCOUNT_SELECT = `
  id,
  agent_id,
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

const AGENT_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT = `
  ${AGENT_PAYSTACK_ACCOUNT_SELECT},
  agent:profiles!agent_paystack_accounts_agent_id_fkey (
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

export async function getActiveAgentPaystackAccount(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_paystack_accounts")
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .maybeSingle<AgentPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deactivateAgentPaystackAccounts(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { error } = await supabase
    .from("agent_paystack_accounts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }
}

export async function createAgentPaystackAccount(
  supabase: SupabaseClient,
  params: {
    agentId: string;
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
  const { data, error } = await supabase
    .from("agent_paystack_accounts")
    .insert({
      agent_id: params.agentId,
      business_name: params.businessName,
      bank_code: params.bankCode,
      bank_name: params.bankName,
      account_number: params.accountNumber,
      account_name: params.accountName,
      paystack_subaccount_code: params.paystackSubaccountCode,
      paystack_subaccount_id: params.paystackSubaccountId,
      currency_code: params.currencyCode,
      is_active: true,
    })
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .single<AgentPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAgentPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("agent_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .single<AgentPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateActiveAgentPaystackAccountVerificationStatus(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    expectedUpdatedAt: string;
    verificationStatus: PaystackVerificationStatus;
    verifiedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("agent_paystack_accounts")
    .update(
      buildVerificationStatusUpdate({
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verifiedAt,
      }),
    )
    .eq("id", params.accountId)
    .eq("is_active", true)
    .eq("updated_at", params.expectedUpdatedAt)
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .maybeSingle<AgentPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPaystackAccountById(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("agent_paystack_accounts")
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle<AgentPaystackAccount>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markAgentPaystackAccountVerified(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    verifiedAt?: string;
  },
) {
  return updateAgentPaystackAccountVerificationStatus(supabase, {
    accountId: params.accountId,
    verificationStatus: "verified",
    verifiedAt: params.verifiedAt,
  });
}

export async function markAgentPaystackAccountFailed(
  supabase: SupabaseClient,
  accountId: string,
) {
  return updateAgentPaystackAccountVerificationStatus(supabase, {
    accountId,
    verificationStatus: "failed",
  });
}

export async function getAgentPaystackAccountsByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("agent_paystack_accounts")
    .select(AGENT_PAYSTACK_ACCOUNT_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<AgentPaystackAccount[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPaystackAccountsWithOwnersByVerificationStatus(
  supabase: SupabaseClient,
  verificationStatus: PaystackVerificationStatus,
  params: {
    activeOnly?: boolean;
  } = {},
) {
  let query = supabase
    .from("agent_paystack_accounts")
    .select(AGENT_PAYSTACK_ACCOUNT_WITH_OWNER_SELECT)
    .eq("verification_status", verificationStatus)
    .order("created_at", { ascending: false });

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } =
    await query.returns<AgentPaystackAccountWithOwner[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPendingAgentPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getAgentPaystackAccountsByVerificationStatus(
    supabase,
    "unverified",
    params,
  );
}

export async function getVerifiedAgentPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getAgentPaystackAccountsByVerificationStatus(
    supabase,
    "verified",
    params,
  );
}

export async function getFailedAgentPaystackAccounts(
  supabase: SupabaseClient,
  params?: {
    activeOnly?: boolean;
  },
) {
  return getAgentPaystackAccountsByVerificationStatus(
    supabase,
    "failed",
    params,
  );
}
