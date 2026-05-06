import "server-only";

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  getTenancyBalanceSummary,
  postInitialTenancyLedgerEntries,
} from "@/server/repositories/ledger.repository";
import {
  createTenancy,
  getActiveTenancyForTenant,
  getActiveTenancyForUnit,
  getRenewalTenanciesForLandlord,
  getTenanciesForLandlord,
  getTenancyById,
  renewTenancyPeriod,
  terminateTenancy,
  type TenancyDetailRow,
} from "@/server/repositories/tenancies.repository";
import { getTenantById } from "@/server/repositories/tenants.repository";
import { getUnitById } from "@/server/repositories/units.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { writeAuditLog } from "@/server/services/audit-log.service";
import type {
  CreateTenancyInput,
  RenewTenancyInput,
  TerminateTenancyInput,
} from "@/server/validators/tenancy.schema";
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

  if (
    unit.status !== "reserved" &&
    unit.status !== "vacant" &&
    unit.status !== "occupied"
  ) {
    throw new AppError(
      "UNIT_NOT_AVAILABLE_FOR_TENANCY",
      "This unit is not available for tenancy setup.",
      400,
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

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenant.id,
    tenancyId: tenancy.id,
    unitId: input.unitId,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenancyCreated,
    entityType: AUDIT_ENTITY_TYPES.tenancy,
    entityId: tenancy.id,
    description: `Tenancy record created for ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      tenancy_reference: tenancy.tenancy_reference,
      rent_amount: tenancy.rent_amount,
      payment_frequency: tenancy.payment_frequency,
      start_date: tenancy.start_date,
      end_date: tenancy.end_date,
      current_period_start: tenancy.current_period_start,
      current_period_end: tenancy.current_period_end,
      next_rent_charge_date: tenancy.next_rent_charge_date,
      unit_status_at_creation: unit.status,
    },
  });

  return tenancy;
}

export async function renewTenancyForCurrentLandlord(input: RenewTenancyInput) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to renew this tenancy.",
      403,
    );
  }

  await renewTenancyPeriod(supabase, input.tenancyId);

  return {
    tenancyId: tenancy.id,
    tenantId: tenancy.tenant_id,
  };
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
