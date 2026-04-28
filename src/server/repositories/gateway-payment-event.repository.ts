import type { SupabaseClient } from "@supabase/supabase-js";

export type GatewayPaymentEventRow = {
  id: string;
  provider: string;
  event_type: string;
  payment_reference: string;
  gateway_payment_intent_id: string | null;
  processed_payment_id: string | null;
  processing_status: "pending" | "processed" | "failed" | "ignored";
  error_message: string | null;
};

export async function registerGatewayPaymentEvent(
  supabase: SupabaseClient,
  params: {
    eventType: string;
    paymentReference: string;
    rawPayload: Record<string, unknown>;
    signature: string;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_events")
    .insert({
      provider: "paystack",
      event_type: params.eventType,
      payment_reference: params.paymentReference,
      raw_payload: params.rawPayload,
      signature: params.signature,
      processing_status: "pending",
    })
    .select(
      "id, provider, event_type, payment_reference, gateway_payment_intent_id, processed_payment_id, processing_status, error_message",
    )
    .single<GatewayPaymentEventRow>();

  if (!error && data) {
    return {
      event: data,
      isDuplicate: false,
    };
  }

  if (error?.code !== "23505") {
    throw error;
  }

  const { data: existing, error: existingError } = await supabase
    .from("gateway_payment_events")
    .select(
      "id, provider, event_type, payment_reference, gateway_payment_intent_id, processed_payment_id, processing_status, error_message",
    )
    .eq("provider", "paystack")
    .eq("payment_reference", params.paymentReference)
    .single<GatewayPaymentEventRow>();

  if (existingError || !existing) {
    throw existingError;
  }

  return {
    event: existing,
    isDuplicate: true,
  };
}

export async function markGatewayPaymentEventProcessed(
  supabase: SupabaseClient,
  params: {
    eventId: string;
    gatewayPaymentIntentId: string;
    processedPaymentId: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("gateway_payment_events")
    .update({
      gateway_payment_intent_id: params.gatewayPaymentIntentId,
      processed_payment_id: params.processedPaymentId,
      verified_payload: params.verifiedPayload,
      processing_status: "processed",
      error_message: null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);

  if (error) {
    throw error;
  }
}

export async function markGatewayPaymentEventIgnored(
  supabase: SupabaseClient,
  params: {
    eventId: string;
    reason: string;
    gatewayPaymentIntentId?: string | null;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("gateway_payment_events")
    .update({
      gateway_payment_intent_id: params.gatewayPaymentIntentId ?? null,
      verified_payload: params.verifiedPayload ?? {},
      processing_status: "ignored",
      error_message: params.reason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);

  if (error) {
    throw error;
  }
}

export async function markGatewayPaymentEventFailed(
  supabase: SupabaseClient,
  params: {
    eventId: string;
    reason: string;
    gatewayPaymentIntentId?: string | null;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("gateway_payment_events")
    .update({
      gateway_payment_intent_id: params.gatewayPaymentIntentId ?? null,
      verified_payload: params.verifiedPayload ?? {},
      processing_status: "failed",
      error_message: params.reason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);

  if (error) {
    throw error;
  }
}
