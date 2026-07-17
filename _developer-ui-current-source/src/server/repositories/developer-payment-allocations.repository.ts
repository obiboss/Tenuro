import type { SupabaseClient } from "@supabase/supabase-js";

export async function createDeveloperPaymentAllocations(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    paymentIntentId: string;
    saleId: string;
    buyerId: string;
    installmentAmount: number;
    platformFeeAmount: number;
    currencyCode: string;
  },
) {
  const rows = [
    {
      developer_account_id: params.developerAccountId,
      payment_intent_id: params.paymentIntentId,
      sale_id: params.saleId,
      buyer_id: params.buyerId,
      recipient_type: "developer",
      amount: params.installmentAmount,
      currency_code: params.currencyCode,
      status: "pending",
      metadata: {
        purpose: "developer_installment_receivable",
      },
    },
  ];

  if (params.platformFeeAmount > 0) {
    rows.push({
      developer_account_id: params.developerAccountId,
      payment_intent_id: params.paymentIntentId,
      sale_id: params.saleId,
      buyer_id: params.buyerId,
      recipient_type: "platform",
      amount: params.platformFeeAmount,
      currency_code: params.currencyCode,
      status: "pending",
      metadata: {
        purpose: "boldverse_installment_platform_fee",
      },
    });
  }

  const { error } = await supabase
    .from("developer_payment_allocations")
    .insert(rows);

  if (error) {
    throw error;
  }
}
