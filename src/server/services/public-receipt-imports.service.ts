import "server-only";

import { listClaimedPublicGeneratedReceiptsForOwner } from "@/server/repositories/public-tool-leads.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "@/server/services/auth.service";

export async function getCurrentLandlordClaimedPublicReceipts() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return listClaimedPublicGeneratedReceiptsForOwner(supabase, landlord.id);
}
