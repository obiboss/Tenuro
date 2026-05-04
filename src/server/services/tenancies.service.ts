import "server-only";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { AppError } from "@/server/errors/app-error";
import { postInitialTenancyLedgerEntries } from "@/server/repositories/ledger.repository";
import {
  createTenancy,
  getActiveTenancyForTenant,
  getActiveTenancyForUnit,
  getRenewalTenanciesForLandlord,
  getTenanciesForLandlord,
  terminateTenancy,
  type TenancyDetailRow,
} from "@/server/repositories/tenancies.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import {
  getUnitById,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  CreateTenancyInput,
  TerminateTenancyInput,
} from "@/server/validators/tenancy.schema";
import { getTenancyBalanceSummary } from "@/server/repositories/ledger.repository";
import { requireLandlord } from "./auth.service";

export type RenewalUrgency =
  | "overdue"
  | "due_today"
  | "within_30_days"
  | "within_60_days"
  | "within_90_days"
  | "later";

export type LandlordRenewalOverviewItem = {
  tenancy: TenancyDetailRow;
  outstandingBalance: number;
  daysUntilDue: number | null;
  urgency: RenewalUrgency;
};

function getDaysUntilDue(nextRentChargeDate: string | null) {
  if (!nextRentChargeDate) {
    return null;
  }

  return differenceInCalendarDays(parseISO(nextRentChargeDate), new Date());
}

function getRenewalUrgency(daysUntilDue: number | null): RenewalUrgency {
  if (daysUntilDue === null) {
    return "later";
  }

  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue === 0) {
    return "due_today";
  }

  if (daysUntilDue <= 30) {
    return "within_30_days";
  }

  if (daysUntilDue <= 60) {
    return "within_60_days";
  }

  if (daysUntilDue <= 90) {
    return "within_90_days";
  }

  return "later";
}

export async function getCurrentLandlordTenancies() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getTenanciesForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordRenewalOverview() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancies = await getRenewalTenanciesForLandlord(supabase, landlord.id);

  const items = await Promise.all(
    tenancies.map(async (tenancy) => {
      const balance = await getTenancyBalanceSummary(supabase, tenancy.id);
      const daysUntilDue = getDaysUntilDue(tenancy.next_rent_charge_date);

      return {
        tenancy,
        outstandingBalance: balance.outstanding_balance,
        daysUntilDue,
        urgency: getRenewalUrgency(daysUntilDue),
      };
    }),
  );

  return {
    items,
    summary: {
      overdue: items.filter((item) => item.urgency === "overdue").length,
      dueToday: items.filter((item) => item.urgency === "due_today").length,
      within30Days: items.filter((item) => item.urgency === "within_30_days")
        .length,
      within60Days: items.filter((item) => item.urgency === "within_60_days")
        .length,
      within90Days: items.filter((item) => item.urgency === "within_90_days")
        .length,
      later: items.filter((item) => item.urgency === "later").length,
    },
  };
}

export async function getCurrentTenantActiveTenancy(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this tenancy.",
      403,
    );
  }

  return getActiveTenancyForTenant(supabase, tenantId);
}

export async function createTenancyForCurrentLandlord(
  input: CreateTenancyInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, input.tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to create a tenancy for this tenant.",
      403,
    );
  }

  if (tenant.unit_id !== input.unitId) {
    throw new AppError(
      "UNIT_TENANT_MISMATCH",
      "This tenant is not assigned to the selected unit.",
      400,
    );
  }

  const unit = await getUnitById(supabase, input.unitId);

  if (
    unit.property_id !== tenant.units?.properties?.id &&
    tenant.units?.properties?.id
  ) {
    throw new AppError(
      "UNIT_NOT_FOUND",
      "The selected unit could not be verified.",
      404,
    );
  }

  const existingTenantTenancy = await getActiveTenancyForTenant(
    supabase,
    input.tenantId,
  );

  if (existingTenantTenancy) {
    throw new AppError(
      "ACTIVE_TENANCY_EXISTS",
      "This tenant already has an active rental agreement.",
      400,
    );
  }

  const existingUnitTenancy = await getActiveTenancyForUnit(
    supabase,
    input.unitId,
  );

  if (existingUnitTenancy) {
    throw new AppError(
      "UNIT_ALREADY_HAS_TENANCY",
      "This unit already has an active rental agreement.",
      400,
    );
  }

  const tenancy = await createTenancy(supabase, {
    landlordId: landlord.id,
    input,
  });

  await postInitialTenancyLedgerEntries(supabase, tenancy.id);
  await markUnitOccupied(supabase, input.unitId);

  return tenancy;
}

export async function terminateTenancyForCurrentLandlord(
  input: TerminateTenancyInput,
) {
  await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return terminateTenancy(supabase, {
    tenancyId: input.tenancyId,
    reason: input.reason,
  });
}
