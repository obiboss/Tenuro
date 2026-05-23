import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentTenantOnboardingTenantRow = {
  id: string;
  landlord_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  onboarding_status:
    | "invited"
    | "documents_submitted"
    | "profile_complete"
    | "submitted_for_landlord_review"
    | "waitlisted"
    | "approved"
    | "rejected"
    | "token_expired";
  onboarding_token_hash: string | null;
  onboarding_token_expires_at: string | null;
  onboarding_token_used_at: string | null;
  landlord_notes: string | null;
  agent_property_listing_id: string | null;
  invited_by_agent_id: string | null;
  created_at: string;
};

export type PublicTenantOnboardingRow = AgentTenantOnboardingTenantRow & {
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    properties: {
      id: string;
      property_name: string;
      landlord_id: string;
    } | null;
  } | null;
};

const AGENT_TENANT_ONBOARDING_SELECT = `
  id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  onboarding_status,
  onboarding_token_hash,
  onboarding_token_expires_at,
  onboarding_token_used_at,
  landlord_notes,
  agent_property_listing_id,
  invited_by_agent_id,
  created_at
`;

const PUBLIC_TENANT_ONBOARDING_SELECT = `
  id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  onboarding_status,
  onboarding_token_hash,
  onboarding_token_expires_at,
  onboarding_token_used_at,
  landlord_notes,
  agent_property_listing_id,
  invited_by_agent_id,
  created_at,
  units (
    id,
    unit_identifier,
    building_name,
    properties (
      id,
      property_name,
      landlord_id
    )
  )
`;

export async function createAgentTenantOnboardingTenant(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    unitId: string;
    agentPropertyListingId: string;
    invitedByAgentId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    note: string | null;
    onboardingTokenHash: string;
    onboardingTokenExpiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      landlord_id: params.landlordId,
      unit_id: params.unitId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      landlord_notes: params.note,
      onboarding_status: "invited",
      onboarding_token_hash: params.onboardingTokenHash,
      onboarding_token_expires_at: params.onboardingTokenExpiresAt,
      onboarding_token_used_at: null,
      agent_property_listing_id: params.agentPropertyListingId,
      invited_by_agent_id: params.invitedByAgentId,
    })
    .select(AGENT_TENANT_ONBOARDING_SELECT)
    .single<AgentTenantOnboardingTenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicTenantByOnboardingTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(PUBLIC_TENANT_ONBOARDING_SELECT)
    .eq("onboarding_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<PublicTenantOnboardingRow>();

  if (error) {
    throw error;
  }

  return data;
}
