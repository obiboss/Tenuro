import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createTenancy,
  getActiveTenancyForTenant,
  getActiveTenancyForUnit,
  getTenanciesForLandlord,
  terminateTenancy,
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
import { requireLandlord } from "./auth.service";
import { postInitialTenancyLedgerEntries } from "@/server/repositories/ledger.repository";

export async function getCurrentLandlordTenancies() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getTenanciesForLandlord(supabase, landlord.id);
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
