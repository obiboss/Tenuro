import type { SupabaseClient } from "@supabase/supabase-js";

export type TenancyBalanceSummary = {
  tenancy_id: string;
  total_debit: number;
  total_credit: number;
  outstanding_balance: number;
};

export type LedgerEntryRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  payment_id: string | null;
  entry_type:
    | "rent_charge"
    | "opening_balance"
    | "payment"
    | "adjustment"
    | "reversal";
  direction: "debit" | "credit";
  amount: number;
  currency_code: string;
  description: string;
  entry_date: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function postInitialTenancyLedgerEntries(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { error } = await supabase.rpc("post_initial_tenancy_ledger_entries", {
    p_tenancy_id: tenancyId,
  });

  if (error) {
    throw error;
  }
}

export async function getTenancyBalanceSummary(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .rpc("get_tenancy_balance_summary", {
      p_tenancy_id: tenancyId,
    })
    .maybeSingle<TenancyBalanceSummary>();

  if (error) {
    throw error;
  }

  return (
    data ?? {
      tenancy_id: tenancyId,
      total_debit: 0,
      total_credit: 0,
      outstanding_balance: 0,
    }
  );
}

export async function getLedgerEntriesForTenancy(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select(
      "id, landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction, amount, currency_code, description, entry_date, metadata, created_at",
    )
    .eq("tenancy_id", tenancyId)
    .order("entry_date", { ascending: false })
    .returns<LedgerEntryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
