import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentPaystackAccount = {
  id: string;
  agent_id: string;
  business_name: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  currency_code: string;
  is_active: boolean;
  verified_at: string;
  created_at: string;
  updated_at: string;
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
  verified_at,
  created_at,
  updated_at
`;

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
