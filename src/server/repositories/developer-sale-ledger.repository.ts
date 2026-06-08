import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperSaleLedgerEntryRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  buyer_id: string;
  payment_id: string | null;
  entry_type:
    | "sale_charge"
    | "payment_credit"
    | "reversal_debit"
    | "adjustment_credit"
    | "adjustment_debit";
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const DEVELOPER_SALE_LEDGER_ENTRY_SELECT = `
  id,
  developer_account_id,
  sale_id,
  buyer_id,
  payment_id,
  entry_type,
  debit_amount,
  credit_amount,
  running_balance,
  description,
  metadata,
  created_at
`;

export async function listDeveloperSaleLedgerEntriesForSale(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_sale_ledger_entries")
    .select(DEVELOPER_SALE_LEDGER_ENTRY_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .order("created_at", { ascending: false })
    .returns<DeveloperSaleLedgerEntryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_SALE_LEDGER_ENTRY_SELECT };
