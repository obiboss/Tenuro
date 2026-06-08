import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperSalePaymentRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  buyer_id: string;
  estate_id: string;
  plot_id: string;
  schedule_item_id: string | null;
  payment_intent_id: string | null;
  amount_paid: number;
  platform_fee_amount: number;
  total_paid_amount: number;
  payment_method: string;
  payment_reference: string;
  payment_date: string;
  status: "posted" | "reversed";
  balance_before: number;
  balance_after: number;
  receipt_number: string | null;
  receipt_path: string | null;
  receipt_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_SALE_PAYMENT_SELECT = `
  id,
  developer_account_id,
  sale_id,
  buyer_id,
  estate_id,
  plot_id,
  schedule_item_id,
  payment_intent_id,
  amount_paid,
  platform_fee_amount,
  total_paid_amount,
  payment_method,
  payment_reference,
  payment_date,
  status,
  balance_before,
  balance_after,
  receipt_number,
  receipt_path,
  receipt_generated,
  metadata,
  created_at,
  updated_at
`;

export async function listDeveloperSalePaymentsForSale(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_sale_payments")
    .select(DEVELOPER_SALE_PAYMENT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .order("created_at", { ascending: false })
    .returns<DeveloperSalePaymentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_SALE_PAYMENT_SELECT };
