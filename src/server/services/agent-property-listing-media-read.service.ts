import "server-only";

import type { AgentPropertyListingMediaRow } from "@/server/repositories/agent-property-listing-media.repository";
import { getMediaForAgentPropertyListings } from "@/server/repositories/agent-property-listing-media.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { buildR2PublicUrl } from "@/server/services/r2.service";

export type AgentPropertyListingMediaView = AgentPropertyListingMediaRow & {
  publicUrl: string | null;
};

export async function getAgentListingMediaByListingId(
  listingIds: string[],
): Promise<Map<string, AgentPropertyListingMediaView[]>> {
  const supabase = createSupabaseAdminClient();
  const mediaRows = await getMediaForAgentPropertyListings(
    supabase,
    listingIds,
  );

  const mediaByListingId = new Map<string, AgentPropertyListingMediaView[]>();

  for (const row of mediaRows) {
    const current = mediaByListingId.get(row.agent_property_listing_id) ?? [];

    current.push({
      ...row,
      publicUrl: buildR2PublicUrl(row.object_key),
    });

    mediaByListingId.set(row.agent_property_listing_id, current);
  }

  return mediaByListingId;
}
