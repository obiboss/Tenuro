import type { SupabaseClient } from "@supabase/supabase-js";

export type LandlordProcessingFeeStatus =
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "cancelled";

export type LandlordProcessingFeeIntentRow = {
  id: string;
  tenant_id: string;
  landlord_id: string;
  paystack_reference: string;
  paystack_access_code: string;
  authorization_url: string;
  processing_fee_amount: number;
  landlord_share_amount: number;
  tenuro_share_amount: number;
  total_amount: number;
  currency_code: string;
  idempotency_key: string;
  status: LandlordProcessingFeeStatus;
  paystack_split_code: string | null;
  paystack_split_id: number | null;
  metadata: Record<string, unknown>;
  verified_payload: Record<string, unknown>;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

const LANDLORD_PROCESSING_FEE_INTENT_SELECT = `
  id,
  tenant_id,
  landlord_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  processing_fee_amount,
  landlord_share_amount,
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

export async function getLatestLandlordProcessingFeeIntentForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LandlordProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPaidLandlordProcessingFeeIntentForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle<LandlordProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLandlordProcessingFeeIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<LandlordProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createLandlordProcessingFeeIntent(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    landlordId: string;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    processingFeeAmount: number;
    landlordShareAmount: number;
    tenuroShareAmount: number;
    totalAmount: number;
    currencyCode: string;
    idempotencyKey: string;
    paystackSplitCode: string | null;
    paystackSplitId: number | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .insert({
      tenant_id: params.tenantId,
      landlord_id: params.landlordId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      processing_fee_amount: params.processingFeeAmount,
      landlord_share_amount: params.landlordShareAmount,
      tenuro_share_amount: params.tenuroShareAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
      paystack_split_code: params.paystackSplitCode,
      paystack_split_id: params.paystackSplitId,
      metadata: params.metadata,
    })
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .single<LandlordProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markLandlordProcessingFeeIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .update({
      status: "paid",
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .maybeSingle<LandlordProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existingIntent, error: existingError } = await supabase
    .from("landlord_tenant_processing_fee_intents")
    .select(LANDLORD_PROCESSING_FEE_INTENT_SELECT)
    .eq("id", params.intentId)
    .single<LandlordProcessingFeeIntentRow>();

  if (existingError) {
    throw existingError;
  }

  return existingIntent;
}

export async function markLandlordProcessingFeeIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: Exclude<LandlordProcessingFeeStatus, "initialized" | "paid">;
    failureReason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("landlord_tenant_processing_fee_intents")
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
