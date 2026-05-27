import "server-only";

import { getPropertyApplicationsForLandlordReview } from "@/server/repositories/property-application-review.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";

export async function getCurrentLandlordPropertyApplicationsForReview() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return getPropertyApplicationsForLandlordReview(supabase, landlord.id);
}
