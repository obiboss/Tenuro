import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantActivationTokenRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  tenants: {
    id: string;
    profile_id: string | null;
    landlord_id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
    onboarding_status: string;
    units: {
      id: string;
      unit_identifier: string;
      properties: {
        id: string;
        property_name: string;
      } | null;
    } | null;
  } | null;
};

const ACTIVATION_TOKEN_SELECT = `
  id,
  landlord_id,
  tenant_id,
  token_hash,
  expires_at,
  used_at,
  created_at,
  tenants (
    id,
    profile_id,
    landlord_id,
    full_name,
    phone_number,
    email,
    onboarding_status,
    units (
      id,
      unit_identifier,
      properties (
        id,
        property_name
      )
    )
  )
`;

export async function saveTenantActivationToken(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenant_activation_tokens")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      token_hash: params.tokenHash,
      expires_at: params.expiresAt,
    })
    .select(ACTIVATION_TOKEN_SELECT)
    .single<TenantActivationTokenRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantActivationTokenByHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenant_activation_tokens")
    .select(ACTIVATION_TOKEN_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle<TenantActivationTokenRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markTenantActivationTokenUsed(
  supabase: SupabaseClient,
  tokenId: string,
) {
  const { error } = await supabase
    .from("tenant_activation_tokens")
    .update({
      used_at: new Date().toISOString(),
    })
    .eq("id", tokenId);

  if (error) {
    throw error;
  }
}

export async function linkTenantToProfile(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    profileId: string;
  },
) {
  const { error } = await supabase
    .from("tenants")
    .update({
      profile_id: params.profileId,
    })
    .eq("id", params.tenantId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}