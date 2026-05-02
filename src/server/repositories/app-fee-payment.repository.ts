import type { SupabaseClient } from "@supabase/supabase-js";

export type AppFeePaymentIntentRow = {
  id: string;
  landlord_id: string;
  tenancy_id: string | null;
  tenant_id: string | null;
  rent_payment_id: string | null;
  paystack_reference: string;
  paystack_access_code: string;
  authorization_url: string;
  fee_amount: number;
  currency_code: string;
  reason: string;
  status: "initialized" | "paid" | "failed" | "abandoned" | "cancelled";
  metadata: Record<string, unknown>;
  idempotency_key: string;
  paid_at: string | null;
  failure_reason: string | null;
  verified_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const APP_FEE_PAYMENT_SELECT = `
  id,
  landlord_id,
  tenancy_id,
  tenant_id,
  rent_payment_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  fee_amount,
  currency_code,
  reason,
  status,
  metadata,
  idempotency_key,
  paid_at,
  failure_reason,
  verified_payload,
  created_at,
  updated_at
`;

export async function getAppFeePaymentIntentByIdempotencyKey(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("app_fee_payment_intents")
    .select(APP_FEE_PAYMENT_SELECT)
    .eq("landlord_id", params.landlordId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle<AppFeePaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAppFeePaymentIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("app_fee_payment_intents")
    .select(APP_FEE_PAYMENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<AppFeePaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAppFeePaymentIntent(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenancyId: string | null;
    tenantId: string | null;
    rentPaymentId: string | null;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    feeAmount: number;
    currencyCode: string;
    metadata: Record<string, unknown>;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("app_fee_payment_intents")
    .insert({
      landlord_id: params.landlordId,
      tenancy_id: params.tenancyId,
      tenant_id: params.tenantId,
      rent_payment_id: params.rentPaymentId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      fee_amount: params.feeAmount,
      currency_code: params.currencyCode,
      metadata: params.metadata,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
    })
    .select(APP_FEE_PAYMENT_SELECT)
    .single<AppFeePaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markAppFeePaymentIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("app_fee_payment_intents")
    .update({
      status: "paid",
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(APP_FEE_PAYMENT_SELECT)
    .single<AppFeePaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markAppFeePaymentIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: "failed" | "abandoned" | "cancelled";
    reason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("app_fee_payment_intents")
    .update({
      status: params.status,
      failure_reason: params.reason,
      verified_payload: params.verifiedPayload ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(APP_FEE_PAYMENT_SELECT)
    .single<AppFeePaymentIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}
