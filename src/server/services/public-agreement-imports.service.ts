import "server-only";

import { listClaimedPublicGeneratedAgreementsForOwner } from "@/server/repositories/public-agreement-generator.repository";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function getCurrentLandlordClaimedPublicAgreements() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return listClaimedPublicGeneratedAgreementsForOwner(supabase, landlord.id);
}
