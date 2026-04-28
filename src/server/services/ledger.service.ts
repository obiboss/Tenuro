import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getLedgerEntriesForTenancy,
  getTenancyBalanceSummary,
} from "@/server/repositories/ledger.repository";
import { getActiveTenancyForTenant } from "@/server/repositories/tenancies.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";

export async function getCurrentTenantLedgerSummary(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this tenant ledger.",
      403,
    );
  }

  const activeTenancy = await getActiveTenancyForTenant(supabase, tenantId);

  if (!activeTenancy) {
    return {
      activeTenancy: null,
      balance: null,
      entries: [],
    };
  }

  const [balance, entries] = await Promise.all([
    getTenancyBalanceSummary(supabase, activeTenancy.id),
    getLedgerEntriesForTenancy(supabase, activeTenancy.id),
  ]);

  return {
    activeTenancy,
    balance,
    entries,
  };
}
