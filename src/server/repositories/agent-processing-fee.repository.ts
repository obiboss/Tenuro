import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentProcessingFeeStatus =
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "cancelled";

export type AgentProcessingFeeIntentRow = {
  id: string;
  tenant_id: string;
  landlord_id: string;
  agent_id: string;
  agent_property_listing_id: string;
  paystack_reference: string;
  paystack_access_code: string;
  authorization_url: string;
  processing_fee_amount: number;
  agent_share_amount: number;
  tenuro_share_amount: number;
  total_amount: number;
  currency_code: string;
  idempotency_key: string;
  status: AgentProcessingFeeStatus;
  paystack_split_code: string | null;
  paystack_split_id: number | null;
  metadata: Record<string, unknown>;
  verified_payload: Record<string, unknown>;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

const AGENT_PROCESSING_FEE_INTENT_SELECT = `
  id,
  tenant_id,
  landlord_id,
  agent_id,
  agent_property_listing_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  processing_fee_amount,
  agent_share_amount,
  tenuro_share_amount,
  total_amount,
  currency_code,
  idempotency_key,
  status,
  paystack_split_code,
  paystack_split_id,
  metadata,
  verified_payload,
  paid_at,
  failure_reason,
  created_at,
  updated_at
`;

export async function getLatestAgentProcessingFeeIntentForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AgentProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPaidAgentProcessingFeeIntentForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle<AgentProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentProcessingFeeIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<AgentProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAgentProcessingFeeIntent(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    landlordId: string;
    agentId: string;
    agentPropertyListingId: string;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    processingFeeAmount: number;
    agentShareAmount: number;
    tenuroShareAmount: number;
    totalAmount: number;
    currencyCode: string;
    idempotencyKey: string;
    paystackSplitCode: string;
    paystackSplitId: number | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .insert({
      tenant_id: params.tenantId,
      landlord_id: params.landlordId,
      agent_id: params.agentId,
      agent_property_listing_id: params.agentPropertyListingId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      processing_fee_amount: params.processingFeeAmount,
      agent_share_amount: params.agentShareAmount,
      tenuro_share_amount: params.tenuroShareAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
      paystack_split_code: params.paystackSplitCode,
      paystack_split_id: params.paystackSplitId,
      metadata: params.metadata,
    })
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .single<AgentProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markAgentProcessingFeeIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .update({
      status: "paid",
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .maybeSingle<AgentProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existingIntent, error: existingError } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .select(AGENT_PROCESSING_FEE_INTENT_SELECT)
    .eq("id", params.intentId)
    .single<AgentProcessingFeeIntentRow>();

  if (existingError) {
    throw existingError;
  }

  return existingIntent;
}

export async function markAgentProcessingFeeIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: Exclude<AgentProcessingFeeStatus, "initialized" | "paid">;
    failureReason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("agent_tenant_processing_fee_intents")
    .update({
      status: params.status,
      failure_reason: params.failureReason,
      verified_payload: params.verifiedPayload ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .eq("status", "initialized");

  if (error) {
    throw error;
  }
}
