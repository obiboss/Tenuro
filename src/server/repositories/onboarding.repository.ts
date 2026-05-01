import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantOnboardingContext = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  landlord_id: string;
  unit_id: string;
  onboarding_status:
    | "invited"
    | "profile_complete"
    | "approved"
    | "rejected"
    | "token_expired";
  onboarding_token_hash: string | null;
  onboarding_token_expires_at: string | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    annual_rent: number | null;
    currency_code: string;
    properties: {
      id: string;
      property_name: string;
      address: string;
    } | null;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
};

const TENANT_ONBOARDING_CONTEXT_SELECT = `
  id,
  full_name,
  phone_number,
  email,
  landlord_id,
  unit_id,
  onboarding_status,
  onboarding_token_hash,
  onboarding_token_expires_at,
  units (
    id,
    unit_identifier,
    building_name,
    annual_rent,
    currency_code,
    properties (
      id,
      property_name,
      address
    )
  ),
  profiles:landlord_id (
    id,
    full_name,
    phone_number,
    email
  )
`;

export async function saveTenantOnboardingToken(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_token_hash: params.tokenHash,
      onboarding_token_expires_at: params.expiresAt,
      onboarding_token_used_at: null,
      onboarding_status: "invited",
    })
    .eq("id", params.tenantId)
    .is("deleted_at", null)
    .select("id, full_name, phone_number, landlord_id, unit_id")
    .single<{
      id: string;
      full_name: string;
      phone_number: string;
      landlord_id: string;
      unit_id: string;
    }>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantOnboardingContextByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_ONBOARDING_CONTEXT_SELECT)
    .eq("onboarding_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<TenantOnboardingContext>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markTenantOnboardingTokenExpired(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { error } = await supabase
    .from("tenants")
    .update({
      onboarding_status: "token_expired",
    })
    .eq("id", tenantId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}
