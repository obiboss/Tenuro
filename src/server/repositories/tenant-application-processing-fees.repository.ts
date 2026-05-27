import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantApplicationProcessingFeeStatus =
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "cancelled";

export type TenantApplicationProcessingFeeIntentRow = {
  id: string;
  property_application_id: string;
  tenant_kyc_profile_id: string;
  agent_property_listing_id: string;
  agent_id: string;
  landlord_id: string | null;
  landlord_phone_number: string | null;
  acquisition_context_key: string;
  paystack_reference: string;
  paystack_access_code: string;
  authorization_url: string;
  processing_fee_amount: number;
  platform_share_amount: number;
  agent_share_amount: number;
  total_amount: number;
  currency_code: string;
  idempotency_key: string;
  status: TenantApplicationProcessingFeeStatus;
  metadata: Record<string, unknown>;
  verified_payload: Record<string, unknown>;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

const TENANT_APPLICATION_PROCESSING_FEE_SELECT = `
  id,
  property_application_id,
  tenant_kyc_profile_id,
  agent_property_listing_id,
  agent_id,
  landlord_id,
  landlord_phone_number,
  acquisition_context_key,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  processing_fee_amount,
  platform_share_amount,
  agent_share_amount,
  total_amount,
  currency_code,
  idempotency_key,
  status,
  metadata,
  verified_payload,
  paid_at,
  failure_reason,
  created_at,
  updated_at
`;

export async function getLatestTenantApplicationProcessingFeeIntent(
  supabase: SupabaseClient,
  propertyApplicationId: string,
) {
  const { data, error } = await supabase
    .from("tenant_application_processing_fee_intents")
    .select(TENANT_APPLICATION_PROCESSING_FEE_SELECT)
    .eq("property_application_id", propertyApplicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TenantApplicationProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantApplicationProcessingFeeIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("tenant_application_processing_fee_intents")
    .select(TENANT_APPLICATION_PROCESSING_FEE_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<TenantApplicationProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTenantApplicationProcessingFeeIntent(
  supabase: SupabaseClient,
  params: {
    propertyApplicationId: string;
    tenantKycProfileId: string;
    agentPropertyListingId: string;
    agentId: string;
    landlordId: string | null;
    landlordPhoneNumber: string | null;
    acquisitionContextKey: string;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    processingFeeAmount: number;
    platformShareAmount: number;
    agentShareAmount: number;
    totalAmount: number;
    currencyCode: string;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("tenant_application_processing_fee_intents")
    .insert({
      property_application_id: params.propertyApplicationId,
      tenant_kyc_profile_id: params.tenantKycProfileId,
      agent_property_listing_id: params.agentPropertyListingId,
      agent_id: params.agentId,
      landlord_id: params.landlordId,
      landlord_phone_number: params.landlordPhoneNumber,
      acquisition_context_key: params.acquisitionContextKey,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      processing_fee_amount: params.processingFeeAmount,
      platform_share_amount: params.platformShareAmount,
      agent_share_amount: params.agentShareAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
      metadata: params.metadata,
    })
    .select(TENANT_APPLICATION_PROCESSING_FEE_SELECT)
    .single<TenantApplicationProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markTenantApplicationProcessingFeeIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("tenant_application_processing_fee_intents")
    .update({
      status: "paid",
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(TENANT_APPLICATION_PROCESSING_FEE_SELECT)
    .maybeSingle<TenantApplicationProcessingFeeIntentRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existingIntent, error: existingError } = await supabase
    .from("tenant_application_processing_fee_intents")
    .select(TENANT_APPLICATION_PROCESSING_FEE_SELECT)
    .eq("id", params.intentId)
    .single<TenantApplicationProcessingFeeIntentRow>();

  if (existingError) {
    throw existingError;
  }

  return existingIntent;
}

export async function markTenantApplicationProcessingFeeIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: Exclude<
      TenantApplicationProcessingFeeStatus,
      "initialized" | "paid"
    >;
    failureReason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("tenant_application_processing_fee_intents")
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
