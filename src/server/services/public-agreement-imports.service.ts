import "server-only";

import { listClaimedPublicGeneratedAgreementsForOwner } from "@/server/repositories/public-agreement-generator.repository";
import { requireLandlord } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function getCurrentLandlordClaimedPublicAgreements() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return listClaimedPublicGeneratedAgreementsForOwner(supabase, landlord.id);
}
