import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { requireLandlord } from "./auth.service";

export async function getCurrentLandlordTenantAgentCommissionAmount(
  tenantId: string,
) {
  const landlord = await requireLandlord();
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this tenant's agent commission.",
      403,
    );
  }

  if (!tenant.agent_property_listing_id || !tenant.invited_by_agent_id) {
    return 0;
  }

  const listing = await getAgentPropertyListingById(
    supabase,
    tenant.agent_property_listing_id,
  );

  if (listing.agent_id !== tenant.invited_by_agent_id) {
    return 0;
  }

  if (
    listing.status !== "converted" &&
    listing.status !== "landlord_verified"
  ) {
    return 0;
  }

  const commissionAmount = Number(listing.agent_commission_amount ?? 0);

  return Number.isFinite(commissionAmount) && commissionAmount > 0
    ? commissionAmount
    : 0;
}
