import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentPropertyListingInput } from "@/server/validators/agent-property-listing.schema";

export type AgentPropertyListingStatus =
  | "draft"
  | "submitted"
  | "landlord_verification_sent"
  | "landlord_verified"
  | "converted"
  | "rejected"
  | "archived";

export type AgentPropertyListingRow = {
  id: string;
  agent_id: string;
  agent_profile_id: string | null;

  landlord_full_name: string;
  landlord_phone_number: string;
  landlord_email: string | null;

  property_name: string;
  address: string;
  state: string;
  lga: string;
  property_type: "residential" | "mixed_use" | "flat_complex";
  country_code: string;
  currency_code: string;

  building_name: string | null;
  unit_identifier: string;
  unit_type:
    | "single_room"
    | "self_contain"
    | "room_and_parlour"
    | "mini_flat"
    | "two_bedroom_flat"
    | "three_bedroom_flat"
    | "duplex"
    | "shop"
    | "office_space"
    | "other";
  bedrooms: number;
  bathrooms: number;
  annual_rent: number | null;
  monthly_rent: number | null;

  status: AgentPropertyListingStatus;
  landlord_verification_token_hash: string | null;
  landlord_verification_token_expires_at: string | null;
  landlord_verified_at: string | null;
  converted_property_id: string | null;
  converted_unit_id: string | null;

  notes: string | null;
  submitted_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const AGENT_PROPERTY_LISTING_SELECT = `
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
  status,
  landlord_verification_token_hash,
  landlord_verification_token_expires_at,
  landlord_verified_at,
  converted_property_id,
  converted_unit_id,
  notes,
  submitted_at,
  archived_at,
  created_at,
  updated_at
`;

export async function createAgentPropertyListing(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    agentProfileId: string;
    input: AgentPropertyListingInput;
  },
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .insert({
      agent_id: params.agentId,
      agent_profile_id: params.agentProfileId,

      landlord_full_name: params.input.landlordFullName,
      landlord_phone_number: params.input.landlordPhoneNumber,
      landlord_email: params.input.landlordEmail?.trim()
        ? params.input.landlordEmail.trim().toLowerCase()
        : null,

      property_name: params.input.propertyName,
      address: params.input.address,
      state: params.input.state,
      lga: params.input.lga,
      property_type: params.input.propertyType,
      country_code: params.input.countryCode,
      currency_code: params.input.currencyCode,

      building_name: params.input.buildingName?.trim()
        ? params.input.buildingName.trim()
        : null,
      unit_identifier: params.input.unitIdentifier,
      unit_type: params.input.unitType,
      bedrooms: params.input.bedrooms,
      bathrooms: params.input.bathrooms,
      annual_rent: params.input.annualRent ?? null,
      monthly_rent: params.input.monthlyRent ?? null,

      status: "submitted",
      notes: params.input.notes?.trim() ? params.input.notes.trim() : null,
    })
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .single<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPropertyListings(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .eq("agent_id", agentId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<AgentPropertyListingRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPropertyListingById(
  supabase: SupabaseClient,
  listingId: string,
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .eq("id", listingId)
    .is("archived_at", null)
    .single<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}
