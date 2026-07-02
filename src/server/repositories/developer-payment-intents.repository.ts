import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperPaymentIntentStatus =
  | "initialized"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type DeveloperPaymentIntentRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  buyer_id: string;
  estate_id: string;
  plot_id: string;
  schedule_item_id: string | null;
  paystack_reference: string;
  paystack_access_code: string | null;
  authorization_url: string | null;
  installment_amount: number;
  platform_fee_amount: number;
  total_amount: number;
  currency_code: string;
  status: DeveloperPaymentIntentStatus;
  paid_at: string | null;
  verified_at: string | null;
  expires_at: string | null;
  processed_payment_id: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_PAYMENT_INTENT_SELECT = `
  id,
  developer_account_id,
  sale_id,
  buyer_id,
  estate_id,
  plot_id,
  schedule_item_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  installment_amount,
  platform_fee_amount,
  total_amount,
  currency_code,
  status,
  paid_at,
  verified_at,
  expires_at,
  processed_payment_id,
  idempotency_key,
  metadata,
  created_at,
  updated_at
`;

export async function getDeveloperPaymentIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("developer_payment_intents")
    .select(DEVELOPER_PAYMENT_INTENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<DeveloperPaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPaymentIntentByIdempotencyKey(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_intents")
    .select(DEVELOPER_PAYMENT_INTENT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle<DeveloperPaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperPaymentIntent(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    buyerId: string;
    estateId: string;
    plotId: string;
    scheduleItemId: string | null;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    installmentAmount: number;
    platformFeeAmount: number;
    totalAmount: number;
    currencyCode: string;
    expiresAt: string;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_intents")
    .insert({
      developer_account_id: params.developerAccountId,
      sale_id: params.saleId,
      buyer_id: params.buyerId,
      estate_id: params.estateId,
      plot_id: params.plotId,
      schedule_item_id: params.scheduleItemId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      installment_amount: params.installmentAmount,
      platform_fee_amount: params.platformFeeAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      status: "initialized",
      expires_at: params.expiresAt,
      idempotency_key: params.idempotencyKey,
      metadata: params.metadata,
    })
    .select(DEVELOPER_PAYMENT_INTENT_SELECT)
    .single<DeveloperPaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markDeveloperPaymentIntentExpired(
  supabase: SupabaseClient,
  params: {
    intentId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_intents")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .eq("status", "initialized")
    .select(DEVELOPER_PAYMENT_INTENT_SELECT)
    .maybeSingle<DeveloperPaymentIntentRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existing, error: existingError } = await supabase
    .from("developer_payment_intents")
    .select(DEVELOPER_PAYMENT_INTENT_SELECT)
    .eq("id", params.intentId)
    .single<DeveloperPaymentIntentRow>();

  if (existingError) {
    throw existingError;
  }

  return existing;
}

export { DEVELOPER_PAYMENT_INTENT_SELECT };
