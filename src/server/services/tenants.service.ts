import { AppError } from "@/server/errors/app-error";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";
import {
  archiveTenant,
  createTenantShell,
  getTenantById,
  getTenantsForLandlord,
  updateTenant,
} from "@/server/repositories/tenants.repository";
import {
  getUnitById,
  getVacantUnitsForLandlord,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { getPropertyById } from "@/server/repositories/properties.repository";
import type {
  CreateTenantShellInput,
  UpdateTenantInput,
} from "@/server/validators/tenant.schema";

export async function getCurrentLandlordTenants() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getTenantsForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordTenant(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this tenant.",
      403,
    );
  }

  return tenant;
}

export async function getCurrentLandlordVacantUnits() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getVacantUnitsForLandlord(supabase, landlord.id);
}

export async function createTenantShellForCurrentLandlord(
  input: CreateTenantShellInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const unit = await getUnitById(supabase, input.unitId);
  const property = await getPropertyById(supabase, unit.property_id);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to add a tenant to this unit.",
      403,
    );
  }

  if (unit.status !== "vacant") {
    throw new AppError(
      "UNIT_NOT_AVAILABLE",
      "This unit is not vacant. Please select another unit.",
      400,
    );
  }

  const tenant = await createTenantShell(supabase, landlord.id, input);
  await markUnitOccupied(supabase, input.unitId);

  return tenant;
}

export async function updateTenantForCurrentLandlord(
  tenantId: string,
  input: UpdateTenantInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this tenant.",
      403,
    );
  }

  return updateTenant(supabase, tenantId, input);
}

export async function archiveTenantForCurrentLandlord(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to archive this tenant.",
      403,
    );
  }

  return archiveTenant(supabase, tenantId);
}
