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
  agent_commission_amount: number;
  agent_commission_note: string | null;

  status: AgentPropertyListingStatus;
  landlord_verification_token_hash: string | null;
  landlord_verification_token_expires_at: string | null;
  landlord_verified_at: string | null;
  landlord_claim_token_hash: string | null;
  landlord_claim_token_expires_at: string | null;
  landlord_claim_token_used_at: string | null;
  matched_landlord_id: string | null;
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

function normaliseCommissionAmount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normaliseOptionalText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

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

      building_name: normaliseOptionalText(params.input.buildingName),
      unit_identifier: params.input.unitIdentifier,
      unit_type: params.input.unitType,
      bedrooms: params.input.bedrooms,
      bathrooms: params.input.bathrooms,
      annual_rent: params.input.annualRent ?? null,
      monthly_rent: params.input.monthlyRent ?? null,
      agent_commission_amount: normaliseCommissionAmount(
        params.input.agentCommissionAmount,
      ),
      agent_commission_note: normaliseOptionalText(
        params.input.agentCommissionNote,
      ),

      status: "submitted",
      notes: normaliseOptionalText(params.input.notes),
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

export async function updateAgentPropertyListingVerificationToken(
  supabase: SupabaseClient,
  params: {
    listingId: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .update({
      landlord_verification_token_hash: params.tokenHash,
      landlord_verification_token_expires_at: params.expiresAt,
      status: "landlord_verification_sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.listingId)
    .in("status", ["submitted", "landlord_verification_sent"])
    .is("archived_at", null)
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .single<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPropertyListingByVerificationTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .eq("landlord_verification_token_hash", tokenHash)
    .is("archived_at", null)
    .maybeSingle<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgentPropertyListingByClaimTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("agent_property_listings")
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .eq("landlord_claim_token_hash", tokenHash)
    .is("archived_at", null)
    .maybeSingle<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function approveAgentPropertyListingByLandlord(
  supabase: SupabaseClient,
  params: {
    listingId: string;
    input: AgentPropertyListingInput;
    matchedLandlordId: string | null;
    claimTokenHash: string | null;
    claimTokenExpiresAt: string | null;
  },
) {
  const verifiedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("agent_property_listings")
    .update({
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

      building_name: normaliseOptionalText(params.input.buildingName),
      unit_identifier: params.input.unitIdentifier,
      unit_type: params.input.unitType,
      bedrooms: params.input.bedrooms,
      bathrooms: params.input.bathrooms,
      annual_rent: params.input.annualRent ?? null,
      monthly_rent: params.input.monthlyRent ?? null,
      agent_commission_amount: normaliseCommissionAmount(
        params.input.agentCommissionAmount,
      ),
      agent_commission_note: normaliseOptionalText(
        params.input.agentCommissionNote,
      ),

      notes: normaliseOptionalText(params.input.notes),

      matched_landlord_id: params.matchedLandlordId,
      landlord_claim_token_hash: params.claimTokenHash,
      landlord_claim_token_expires_at: params.claimTokenExpiresAt,

      status: "landlord_verified",
      landlord_verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("id", params.listingId)
    .eq("status", "landlord_verification_sent")
    .is("archived_at", null)
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .single<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markAgentPropertyListingClaimedAndConverted(
  supabase: SupabaseClient,
  params: {
    listingId: string;
    landlordId: string;
    propertyId: string;
    unitId: string;
  },
) {
  const usedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("agent_property_listings")
    .update({
      matched_landlord_id: params.landlordId,
      converted_property_id: params.propertyId,
      converted_unit_id: params.unitId,
      status: "converted",
      landlord_verification_token_hash: null,
      landlord_verification_token_expires_at: null,
      landlord_claim_token_hash: null,
      landlord_claim_token_expires_at: null,
      landlord_claim_token_used_at: usedAt,
      updated_at: usedAt,
    })
    .eq("id", params.listingId)
    .eq("status", "landlord_verified")
    .is("archived_at", null)
    .select(AGENT_PROPERTY_LISTING_SELECT)
    .single<AgentPropertyListingRow>();

  if (error) {
    throw error;
  }

  return data;
}
