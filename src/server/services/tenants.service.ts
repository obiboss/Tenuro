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
  waitlistTenant,
} from "@/server/repositories/tenants.repository";
import {
  getActiveTenancyForUnit,
  getTenancyPipelineSummariesForLandlord,
} from "@/server/repositories/tenancies.repository";
import {
  getUnitById,
  getVacantUnitsForLandlord,
  markUnitReserved,
  markUnitVacant,
} from "@/server/repositories/units.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createTenantKycDocumentLinks } from "@/server/services/storage.service";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  CreateTenantShellInput,
  RejectTenantInput,
  UpdateTenantInput,
  WaitlistTenantInput,
} from "@/server/validators/tenant.schema";
import { resolveTenantPipelineStatus } from "@/lib/tenant-pipeline-status";
import { isSubmittedForLandlordReview } from "@/server/constants/onboarding-lifecycle";
import { requireLandlordPlatformOperator } from "./auth.service";

export type TenantPipelineSummary = {
  isAgreementSetup: boolean;
  isOperationallyLive: boolean;
  chargesConfirmed: boolean;
  agreementDocumentStatus:
    | "draft"
    | "finalized"
    | "sent_to_tenant"
    | "accepted"
    | "voided"
    | null;
};

export async function getCurrentLandlordTenants() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return getTenantsForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordTenantPipelineSummaries() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const summaries = await getTenancyPipelineSummariesForLandlord(
    supabase,
    landlord.id,
  );

  const pipelineByTenantId = new Map<string, TenantPipelineSummary>();

  for (const summary of summaries) {
    const agreementDocuments = summary.tenancy_agreement_documents as
      | {
          document_status:
            | "draft"
            | "finalized"
            | "sent_to_tenant"
            | "accepted"
            | "voided";
        }
      | {
          document_status:
            | "draft"
            | "finalized"
            | "sent_to_tenant"
            | "accepted"
            | "voided";
        }[]
      | null;

    const agreementDocumentStatus = Array.isArray(agreementDocuments)
      ? (agreementDocuments[0]?.document_status ?? null)
      : (agreementDocuments?.document_status ?? null);

    pipelineByTenantId.set(summary.tenant_id, {
      isAgreementSetup: summary.agreement_live_at === null,
      isOperationallyLive: summary.agreement_live_at !== null,
      chargesConfirmed: Boolean(summary.charges_confirmed_at),
      agreementDocumentStatus,
    });
  }

  return pipelineByTenantId;
}

export async function getCurrentLandlordTenantsWithPipeline() {
  const [tenants, pipelineByTenantId] = await Promise.all([
    getCurrentLandlordTenants(),
    getCurrentLandlordTenantPipelineSummaries(),
  ]);

  return tenants.map((tenant) => {
    const pipeline = pipelineByTenantId.get(tenant.id);

    return {
      tenant,
      pipelineStatus: resolveTenantPipelineStatus({
        onboardingStatus: tenant.onboarding_status,
        isAgreementSetup: pipeline?.isAgreementSetup ?? false,
        isOperationallyLive: pipeline?.isOperationallyLive ?? false,
        chargesConfirmed: pipeline?.chargesConfirmed ?? false,
        agreementDocumentStatus: pipeline?.agreementDocumentStatus ?? null,
      }),
    };
  });
}

export async function getCurrentLandlordTenant(tenantId: string) {
  const landlord = await requireLandlordPlatformOperator();
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
  const landlord = await requireLandlordPlatformOperator();
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
  const landlord = await requireLandlordPlatformOperator();
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
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return getVacantUnitsForLandlord(supabase, landlord.id);
}

async function releaseUnitIfNoActiveTenancy(params: {
  landlordId: string;
  actorProfileId: string;
  tenantId: string;
  unitId: string;
  propertyId: string | null;
  tenantName: string;
  previousStatus: string | null;
  reason: string;
}) {
  const supabase = await createSupabaseServerClient();
  const activeTenancy = await getActiveTenancyForUnit(supabase, params.unitId);

  if (activeTenancy) {
    return null;
  }

  const releasedUnit = await markUnitVacant(supabase, params.unitId);

  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: params.tenantId,
    unitId: params.unitId,
    propertyId: params.propertyId,
    actorProfileId: params.actorProfileId,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: params.unitId,
    description: `${releasedUnit.unit_identifier} was released back to vacant.`,
    metadata: {
      tenant_name: params.tenantName,
      previous_unit_status: params.previousStatus,
      new_unit_status: releasedUnit.status,
      reason: params.reason,
    },
  });

  return releasedUnit;
}

export async function createTenantShellForCurrentLandlord(
  input: CreateTenantShellInput,
) {
  const landlord = await requireLandlordPlatformOperator();
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

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);

  const tenant = await createTenantShell(supabase, landlord.id, {
    ...input,
    phoneNumber: normalizedPhone.e164,
  });
  const reservedUnit = await markUnitReserved(supabase, input.unitId);

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

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenant.id,
    unitId: input.unitId,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: input.unitId,
    description: `${unit.unit_identifier} was reserved for ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      unit_identifier: unit.unit_identifier,
      property_name: property.property_name,
      previous_unit_status: unit.status,
      new_unit_status: reservedUnit.status,
      reason: "tenant_shell_created",
    },
  });

  return tenant;
}

export async function updateTenantForCurrentLandlord(
  tenantId: string,
  input: UpdateTenantInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this tenant.",
      403,
    );
  }

  const updateInput: UpdateTenantInput = { ...input };

  if (input.phoneNumber !== undefined) {
    updateInput.phoneNumber = normalisePhoneNumber(input.phoneNumber).e164;
  }

  const updatedTenant = await updateTenant(supabase, tenantId, updateInput);

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
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to approve this tenant.",
      403,
    );
  }

  if (!isSubmittedForLandlordReview(tenant.onboarding_status)) {
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
  const landlord = await requireLandlordPlatformOperator();
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
    !isSubmittedForLandlordReview(tenant.onboarding_status) &&
    tenant.onboarding_status !== "waitlisted"
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

  await releaseUnitIfNoActiveTenancy({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    tenantName: tenant.full_name,
    previousStatus: tenant.units?.status ?? null,
    reason: "tenant_rejected",
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

export async function waitlistTenantForCurrentLandlord(
  tenantId: string,
  input: WaitlistTenantInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to waitlist this tenant.",
      403,
    );
  }

  if (!isSubmittedForLandlordReview(tenant.onboarding_status)) {
    throw new AppError(
      "TENANT_NOT_READY_FOR_WAITLIST",
      "This tenant has not completed their application for review yet.",
      400,
    );
  }

  const waitlistedTenant = await waitlistTenant(supabase, {
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
    eventType: AUDIT_EVENT_TYPES.landlordWaitlisted,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenantId,
    description: `${tenant.full_name} was waitlisted during tenant onboarding review.`,
    metadata: {
      tenant_name: tenant.full_name,
      previous_status: tenant.onboarding_status,
      new_status: waitlistedTenant.onboarding_status,
      waitlist_reason: input.reason,
    },
  });

  return waitlistedTenant;
}

export async function archiveTenantForCurrentLandlord(tenantId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantById(supabase, tenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to archive this tenant.",
      403,
    );
  }

  await archiveTenant(supabase, tenantId);

  await releaseUnitIfNoActiveTenancy({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    tenantId,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    tenantName: tenant.full_name,
    previousStatus: tenant.units?.status ?? null,
    reason: "tenant_archived_without_active_tenancy",
  });

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
}
