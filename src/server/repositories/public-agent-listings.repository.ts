import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentPropertyListingRow } from "@/server/repositories/agent-property-listings.repository";

const PUBLIC_AGENT_LISTING_SELECT = `
  id,
  agent_id,
  agent_profile_id,
  landlord_full_name,
  landlord_phone_number,
  landlord_email,
  property_name,
  address,
  state,
  lga,
  property_type,
  country_code,
  currency_code,
  building_name,
  unit_identifier,
  unit_type,
  bedrooms,
  bathrooms,
  annual_rent,
  monthly_rent,
  agent_commission_amount,
  agent_commission_note,
  status,
  landlord_verification_token_hash,
  landlord_verification_token_expires_at,
  landlord_verified_at,
  landlord_claim_token_hash,
  landlord_claim_token_expires_at,
  landlord_claim_token_used_at,
  matched_landlord_id,
  converted_property_id,
  converted_unit_id,
  notes,
  submitted_at,
  archived_at,
  created_at,
  updated_at
`;

export async function getPublicAvailableAgentListings(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(PUBLIC_AGENT_LISTING_SELECT)
    .eq("agent_id", agentId)
    .in("status", ["landlord_verified", "converted"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<AgentPropertyListingRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicAvailableAgentListingById(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    listingId: string;
  },
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(PUBLIC_AGENT_LISTING_SELECT)
    .eq("agent_id", params.agentId)
    .eq("id", params.listingId)
    .in("status", ["landlord_verified", "converted"])
    .is("archived_at", null)
    .maybeSingle<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}
