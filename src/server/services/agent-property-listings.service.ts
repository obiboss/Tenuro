import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createAgentPropertyListing,
  getAgentPropertyListings,
} from "@/server/repositories/agent-property-listings.repository";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { getAgentProfileByAgentId } from "@/server/repositories/agent-profile.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { AgentPropertyListingInput } from "@/server/validators/agent-property-listing.schema";
import { requireAgent } from "./auth.service";

async function writeAgentPropertyListingAuditLog(params: {
  agentId: string;
  listingId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: null,
    tenant_id: null,
    tenancy_id: null,
    unit_id: null,
    property_id: null,
    actor_profile_id: params.agentId,
    actor_role: "agent",
    event_type: "agent_property_listing_created",
    entity_type: "agent_property_listing",
    entity_id: params.listingId,
    description: params.description,
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
}

export async function getCurrentAgentListingsWorkspace() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const [profile, paystackAccount, listings] = await Promise.all([
    getAgentProfileByAgentId(supabase, agent.id),
    getActiveAgentPaystackAccount(supabase, agent.id),
    getAgentPropertyListings(supabase, agent.id),
  ]);

  return {
    agent,
    profile,
    paystackAccount,
    listings,
  };
}

export async function createPropertyListingForCurrentAgent(
  input: AgentPropertyListingInput,
) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const profile = await getAgentProfileByAgentId(supabase, agent.id);

  if (!profile) {
    throw new AppError(
      "AGENT_PROFILE_REQUIRED",
      "Complete your agent profile before submitting a property listing.",
      400,
    );
  }

  const normalizedLandlordPhone = normalisePhoneNumber(
    input.landlordPhoneNumber,
  );

  const listing = await createAgentPropertyListing(supabase, {
    agentId: agent.id,
    agentProfileId: profile.id,
    input: {
      ...input,
      landlordPhoneNumber: normalizedLandlordPhone.e164,
    },
  });

  await writeAgentPropertyListingAuditLog({
    agentId: agent.id,
    listingId: listing.id,
    description: `Agent submitted property listing: ${listing.property_name}.`,
    metadata: {
      property_name: listing.property_name,
      property_type: listing.property_type,
      state: listing.state,
      lga: listing.lga,
      landlord_full_name: listing.landlord_full_name,
      unit_identifier: listing.unit_identifier,
      unit_type: listing.unit_type,
      annual_rent: listing.annual_rent,
      monthly_rent: listing.monthly_rent,
      status: listing.status,
    },
  });

  return listing;
}
