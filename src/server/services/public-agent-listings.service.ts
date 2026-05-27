import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getPublicAvailableAgentListingById,
  getPublicAvailableAgentListings,
} from "@/server/repositories/public-agent-listings.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export async function getPublicAgentListings(agentId: string) {
  const supabase = createSupabaseAdminClient();

  return getPublicAvailableAgentListings(supabase, agentId);
}

export async function getPublicAgentListing(params: {
  agentId: string;
  listingId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const listing = await getPublicAvailableAgentListingById(supabase, params);

  if (!listing) {
    throw new AppError(
      "LISTING_NOT_AVAILABLE",
      "This listing is no longer available.",
      404,
    );
  }

  return listing;
}
