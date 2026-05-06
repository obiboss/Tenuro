import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getActiveGuarantorForTenant } from "@/server/repositories/guarantors.repository";
import { getPropertyById } from "@/server/repositories/properties.repository";
import {
  approveTenant,
  archiveTenant,
  createTenantShell,
  getTenantById,
  getTenantsForLandlord,
  rejectTenant,
  updateTenant,
} from "@/server/repositories/tenants.repository";
import {
  getUnitById,
  getVacantUnitsForLandlord,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createTenantKycDocumentLinks } from "@/server/services/storage.service";
import type {
  CreateTenantShellInput,
  RejectTenantInput,
  UpdateTenantInput,
} from "@/server/validators/tenant.schema";
import { requireLandlord } from "./auth.service";

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

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenant.id,
    unitId: input.unitId,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantCreated,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenant.id,
    description: `Tenant shell created for ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      unit_identifier: unit.unit_identifier,
      property_name: property.property_name,
      onboarding_status: tenant.onboarding_status,
    },
  });

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

  const updatedTenant = await updateTenant(supabase, tenantId, input);

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantUpdated,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenantId,
    description: `${tenant.full_name} tenant details were updated.`,
    metadata: {
      tenant_name: tenant.full_name,
      updated_fields: Object.keys(input),
      previous_onboarding_status: tenant.onboarding_status,
      current_onboarding_status: updatedTenant.onboarding_status,
    },
  });

  return updatedTenant;
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

  const approvedTenant = await approveTenant(supabase, {
    tenantId,
    approvedBy: landlord.id,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantApproved,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenantId,
    description: `${tenant.full_name} was approved for tenancy setup.`,
    metadata: {
      tenant_name: tenant.full_name,
      previous_status: tenant.onboarding_status,
      new_status: approvedTenant.onboarding_status,
      approved_at: approvedTenant.approved_at,
    },
  });

  return approvedTenant;
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

  const rejectedTenant = await rejectTenant(supabase, {
    tenantId,
    reason: input.reason,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantRejected,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenantId,
    description: `${tenant.full_name} was rejected from tenant onboarding.`,
    metadata: {
      tenant_name: tenant.full_name,
      previous_status: tenant.onboarding_status,
      new_status: rejectedTenant.onboarding_status,
      rejection_reason: input.reason,
    },
  });

  return rejectedTenant;
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

  const archivedTenant = await archiveTenant(supabase, tenantId);

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantArchived,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenantId,
    description: `${tenant.full_name} was archived.`,
    metadata: {
      tenant_name: tenant.full_name,
      previous_onboarding_status: tenant.onboarding_status,
      archived_at: new Date().toISOString(),
    },
  });

  return archivedTenant;
}
