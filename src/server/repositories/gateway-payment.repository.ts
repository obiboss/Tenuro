import type { SupabaseClient } from "@supabase/supabase-js";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";

const GATEWAY_PAYMENT_INTENT_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  rent_amount,
  tenuro_fee_amount,
  total_amount,
  currency_code,
  period_start,
  period_end,
  idempotency_key,
  status,
  metadata,
  paid_at,
  processed_payment_id,
  failure_reason,
  verified_payload,
  created_at,
  updated_at
`;

export async function getGatewayPaymentIntentByIdempotencyKey(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("landlord_id", params.landlordId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getGatewayPaymentIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGatewayPaymentIntent(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    rentAmount: number;
    tenuroFeeAmount: number;
    totalAmount: number;
    currencyCode: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      rent_amount: params.rentAmount,
      tenuro_fee_amount: params.tenuroFeeAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      period_start: params.periodStart ?? null,
      period_end: params.periodEnd ?? null,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
      metadata: params.metadata,
    })
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .single<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markGatewayPaymentIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paymentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .update({
      status: "paid",
      processed_payment_id: params.paymentId,
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .single<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markGatewayPaymentIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: "failed" | "abandoned" | "cancelled";
    reason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("gateway_payment_intents")
    .update({
      status: params.status,
      failure_reason: params.reason,
      verified_payload: params.verifiedPayload ?? {},
    })
    .eq("id", params.intentId)
    .neq("status", "paid");

  if (error) {
    throw error;
  }
}
