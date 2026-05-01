import { AppError } from "@/server/errors/app-error";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "./auth.service";
import {
  approveTenant,
  archiveTenant,
  createTenantShell,
  getTenantById,
  getTenantsForLandlord,
  rejectTenant,
  updateTenant,
} from "@/server/repositories/tenants.repository";
import { getActiveGuarantorForTenant } from "@/server/repositories/guarantors.repository";
import {
  getUnitById,
  getVacantUnitsForLandlord,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { getPropertyById } from "@/server/repositories/properties.repository";
import { createTenantKycDocumentLinks } from "@/server/services/storage.service";
import type {
  CreateTenantShellInput,
  RejectTenantInput,
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

export async function getCurrentLandlordTenantGuarantor(tenantId: string) {
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

  return getActiveGuarantorForTenant(supabase, tenantId);
}

export async function getCurrentLandlordTenantKycDocumentLinks(
  tenantId: string,
) {
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

  const guarantor = await getActiveGuarantorForTenant(supabase, tenantId);

  return createTenantKycDocumentLinks({
    tenantIdDocumentPath: tenant.id_document_path,
    tenantPassportPhotoPath: tenant.passport_photo_path,
    guarantorIdDocumentPath: guarantor?.id_document_path ?? null,
  });
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

  /*
   * Existing behaviour kept for now to avoid changing occupancy logic inside
   * this review batch. We should revisit this in a later unit reservation batch.
   */
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

export async function approveTenantForCurrentLandlord(tenantId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to approve this tenant.",
      403,
    );
  }

  if (tenant.onboarding_status !== "profile_complete") {
    throw new AppError(
      "TENANT_NOT_READY_FOR_APPROVAL",
      "This tenant has not completed their profile yet.",
      400,
    );
  }

  return approveTenant(supabase, {
    tenantId,
    approvedBy: landlord.id,
  });
}

export async function rejectTenantForCurrentLandlord(
  tenantId: string,
  input: RejectTenantInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to reject this tenant.",
      403,
    );
  }

  if (
    tenant.onboarding_status !== "invited" &&
    tenant.onboarding_status !== "profile_complete"
  ) {
    throw new AppError(
      "TENANT_REVIEW_CLOSED",
      "This tenant can no longer be rejected from this review stage.",
      400,
    );
  }

  return rejectTenant(supabase, {
    tenantId,
    reason: input.reason,
  });
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
