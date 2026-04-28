import "server-only";

import { getRentCollectedForLandlord } from "@/server/repositories/payments.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";
import { getThisYearPaymentFilter } from "./payments.service";

export type OverviewStats = {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  rentCollectedThisYear: number;
  upcomingRenewals: number;
};

export async function getCurrentLandlordOverviewStats(): Promise<OverviewStats> {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select(
      `
      id,
      units (
        id,
        status
      )
    `,
    )
    .eq("landlord_id", landlord.id)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (propertiesError) {
    throw propertiesError;
  }

  const { count: tenantCount, error: tenantError } = await supabase
    .from("tenants")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("landlord_id", landlord.id)
    .is("deleted_at", null);

  if (tenantError) {
    throw tenantError;
  }

  const rentCollectedThisYear = await getRentCollectedForLandlord(
    supabase,
    landlord.id,
    getThisYearPaymentFilter(),
  );

  const units = properties.flatMap((property) => property.units ?? []);

  return {
    totalProperties: properties.length,
    totalUnits: units.length,
    occupiedUnits: units.filter((unit) => unit.status === "occupied").length,
    vacantUnits: units.filter((unit) => unit.status === "vacant").length,
    totalTenants: tenantCount ?? 0,
    rentCollectedThisYear,
    upcomingRenewals: 0,
  };
}
