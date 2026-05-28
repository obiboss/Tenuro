import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import { getPropertyApplicationsForLandlordReview } from "@/server/repositories/property-application-review.repository";
import { getPropertyById } from "@/server/repositories/properties.repository";
import {
  getPropertyApplicationById,
  getTenantKycProfileById,
  updatePropertyApplicationStatus,
} from "@/server/repositories/tenant-applications.repository";
import {
  createTenantFromPropertyApplication,
  getTenantById,
  getTenantBySourcePropertyApplicationId,
  markTenantRejectedAfterInspection,
  type TenantIdType,
} from "@/server/repositories/tenants.repository";
import { getActiveTenancyForUnit } from "@/server/repositories/tenancies.repository";
import {
  getUnitById,
  markUnitReserved,
  markUnitVacant,
} from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { queueLandlordPreparedWhatsappNotification } from "@/server/services/notification-queue.service";

const REVIEWABLE_APPLICATION_STATUSES = [
  "submitted_for_landlord_review",
  "waitlisted",
] as const;

function toTenantIdType(value: string | null): TenantIdType {
  if (
    value === "nin" ||
    value === "passport" ||
    value === "drivers_license" ||
    value === "voters_card"
  ) {
    return value;
  }

  return null;
}

function buildTenantAcceptedMessage(params: {
  tenantName: string;
  propertyName: string;
  unitIdentifier: string;
}) {
  return `Hello ${params.tenantName}, your application for ${params.propertyName}, ${params.unitIdentifier} has been accepted for the next stage. This approval is subject to final inspection, agreement completion, and payment conditions. BOPA will guide the next step.`;
}

function buildTenantRejectedMessage(params: {
  tenantName: string;
  propertyName: string;
  unitIdentifier: string;
  reason: string;
}) {
  return `Hello ${params.tenantName}, your application for ${params.propertyName}, ${params.unitIdentifier} was not approved at this time. Reason: ${params.reason}. Your KYC profile can still be reused for another eligible listing.`;
}

function buildTenantWaitlistedMessage(params: {
  tenantName: string;
  propertyName: string;
  unitIdentifier: string;
  reason: string;
}) {
  return `Hello ${params.tenantName}, your application for ${params.propertyName}, ${params.unitIdentifier} has been waitlisted. Reason: ${params.reason}. The landlord or agent will contact you if the application can proceed.`;
}

export async function getCurrentLandlordPropertyApplicationsForReview() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return getPropertyApplicationsForLandlordReview(supabase, landlord.id);
}

async function getReviewableApplicationForCurrentLandlord(
  applicationId: string,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();
  const application = await getPropertyApplicationById(supabase, applicationId);

  if (application.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to review this application.",
      403,
    );
  }

  if (!REVIEWABLE_APPLICATION_STATUSES.includes(application.status as never)) {
    throw new AppError(
      "APPLICATION_NOT_REVIEWABLE",
      "This application is not currently available for landlord review.",
      400,
    );
  }

  return {
    landlord,
    supabase,
    application,
  };
}

async function getAcceptedApplicationForCurrentLandlord(applicationId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = createSupabaseAdminClient();
  const application = await getPropertyApplicationById(supabase, applicationId);

  if (application.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to update this application.",
      403,
    );
  }

  if (application.status !== "accepted") {
    throw new AppError(
      "APPLICATION_NOT_ACCEPTED",
      "This application has not been accepted yet.",
      400,
    );
  }

  const convertedTenantId = application.converted_tenant_id;

  if (!convertedTenantId) {
    throw new AppError(
      "APPLICATION_NOT_CONVERTED",
      "This application has not been converted into the tenant pipeline.",
      400,
    );
  }

  return {
    landlord,
    supabase,
    application,
    convertedTenantId,
  };
}

async function writeApplicationDecisionAudit(params: {
  landlordId: string;
  actorProfileId: string;
  applicationId: string;
  tenantId?: string | null;
  unitId?: string | null;
  propertyId?: string | null;
  eventType:
    | typeof AUDIT_EVENT_TYPES.propertyApplicationAccepted
    | typeof AUDIT_EVENT_TYPES.propertyApplicationRejected
    | typeof AUDIT_EVENT_TYPES.propertyApplicationWaitlisted
    | typeof AUDIT_EVENT_TYPES.propertyApplicationTenantRejected
    | typeof AUDIT_EVENT_TYPES.propertyApplicationConvertedToTenant
    | typeof AUDIT_EVENT_TYPES.unitStatusChanged
    | typeof AUDIT_EVENT_TYPES.tenantCreated;
  entityType:
    | typeof AUDIT_ENTITY_TYPES.propertyApplication
    | typeof AUDIT_ENTITY_TYPES.tenant
    | typeof AUDIT_ENTITY_TYPES.unit;
  entityId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: params.tenantId ?? null,
    unitId: params.unitId ?? null,
    propertyId: params.propertyId ?? null,
    actorProfileId: params.actorProfileId,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  });
}

async function queueTenantOutcomeWhatsapp(params: {
  landlordId: string;
  tenantId: string | null;
  messageBody: string;
}) {
  await queueLandlordPreparedWhatsappNotification({
    landlordId: params.landlordId,
    tenantId: params.tenantId,
    messageBody: params.messageBody,
  });
}

export async function acceptPropertyApplicationForCurrentLandlord(
  applicationId: string,
) {
  const { landlord, supabase, application } =
    await getReviewableApplicationForCurrentLandlord(applicationId);

  if (application.converted_tenant_id) {
    return updatePropertyApplicationStatus(supabase, {
      applicationId: application.id,
      status: "accepted",
      convertedTenantId: application.converted_tenant_id,
      decidedBy: landlord.id,
    });
  }

  const existingTenant = await getTenantBySourcePropertyApplicationId(
    supabase,
    application.id,
  );

  if (existingTenant) {
    const updatedApplication = await updatePropertyApplicationStatus(supabase, {
      applicationId: application.id,
      status: "accepted",
      convertedTenantId: existingTenant.id,
      decidedBy: landlord.id,
    });

    await queueTenantOutcomeWhatsapp({
      landlordId: landlord.id,
      tenantId: existingTenant.id,
      messageBody: buildTenantAcceptedMessage({
        tenantName: existingTenant.full_name,
        propertyName: "the selected property",
        unitIdentifier: "the selected unit",
      }),
    });

    await writeApplicationDecisionAudit({
      landlordId: landlord.id,
      actorProfileId: landlord.id,
      applicationId: application.id,
      tenantId: existingTenant.id,
      unitId: existingTenant.unit_id,
      propertyId: null,
      eventType: AUDIT_EVENT_TYPES.propertyApplicationAccepted,
      entityType: AUDIT_ENTITY_TYPES.propertyApplication,
      entityId: application.id,
      description:
        "Property application accepted using an existing converted tenant record.",
      metadata: {
        tenant_id: existingTenant.id,
        application_status: updatedApplication.status,
      },
    });

    return updatedApplication;
  }

  const listing = await getAgentPropertyListingById(
    supabase,
    application.agent_property_listing_id,
  );

  if (!listing.converted_unit_id || !listing.converted_property_id) {
    throw new AppError(
      "LISTING_NOT_CONVERTED",
      "This listing has not been converted into a landlord property/unit yet.",
      400,
    );
  }

  if (listing.matched_landlord_id !== landlord.id) {
    throw new AppError(
      "LISTING_LANDLORD_MISMATCH",
      "This listing does not belong to your landlord account.",
      403,
    );
  }

  const unit = await getUnitById(supabase, listing.converted_unit_id);
  const property = await getPropertyById(supabase, unit.property_id);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "UNIT_LANDLORD_MISMATCH",
      "This unit does not belong to your landlord account.",
      403,
    );
  }

  if (unit.status !== "vacant") {
    throw new AppError(
      "UNIT_NOT_AVAILABLE",
      "This unit is no longer vacant. Mark the application unavailable or select another available listing.",
      400,
    );
  }

  const kycProfile = await getTenantKycProfileById(
    supabase,
    application.tenant_kyc_profile_id,
  );

  const tenant = await createTenantFromPropertyApplication(supabase, {
    landlordId: landlord.id,
    unitId: unit.id,
    fullName: kycProfile.full_name,
    phoneNumber: kycProfile.phone_number,
    email: kycProfile.email,
    dateOfBirth: kycProfile.date_of_birth,
    homeAddress: kycProfile.home_address,
    occupation: kycProfile.occupation,
    employer: kycProfile.employer,
    idType: toTenantIdType(kycProfile.id_type),
    idDocumentPath: kycProfile.id_document_path,
    passportPhotoPath: kycProfile.passport_photo_path,
    kycAnswers: kycProfile.kyc_answers,
    kycReviewFlags: kycProfile.kyc_review_flags,
    approvedBy: landlord.id,
    agentPropertyListingId: listing.id,
    invitedByAgentId: listing.agent_id,
    sourcePropertyApplicationId: application.id,
  });

  const reservedUnit = await markUnitReserved(supabase, unit.id);

  const updatedApplication = await updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "accepted",
    convertedTenantId: tenant.id,
    decidedBy: landlord.id,
  });

  await queueTenantOutcomeWhatsapp({
    landlordId: landlord.id,
    tenantId: tenant.id,
    messageBody: buildTenantAcceptedMessage({
      tenantName: tenant.full_name,
      propertyName: property.property_name,
      unitIdentifier: unit.unit_identifier,
    }),
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    tenantId: tenant.id,
    unitId: unit.id,
    propertyId: property.id,
    eventType: AUDIT_EVENT_TYPES.tenantCreated,
    entityType: AUDIT_ENTITY_TYPES.tenant,
    entityId: tenant.id,
    description: `Tenant record created from accepted property application for ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      tenant_phone_number: tenant.phone_number,
      property_application_id: application.id,
      agent_property_listing_id: listing.id,
      agent_id: listing.agent_id,
      unit_identifier: unit.unit_identifier,
      property_name: property.property_name,
    },
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    tenantId: tenant.id,
    unitId: unit.id,
    propertyId: property.id,
    eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: unit.id,
    description: `${unit.unit_identifier} was reserved after property application acceptance.`,
    metadata: {
      tenant_id: tenant.id,
      tenant_name: tenant.full_name,
      previous_unit_status: unit.status,
      new_unit_status: reservedUnit.status,
      property_application_id: application.id,
      reason: "property_application_accepted",
    },
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    tenantId: tenant.id,
    unitId: unit.id,
    propertyId: property.id,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationConvertedToTenant,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: application.id,
    description:
      "Accepted property application was converted into the tenant pipeline.",
    metadata: {
      tenant_id: tenant.id,
      converted_tenant_id: updatedApplication.converted_tenant_id,
      property_application_id: application.id,
      agent_property_listing_id: listing.id,
      unit_id: unit.id,
      property_id: property.id,
      application_status: updatedApplication.status,
    },
  });

  return updatedApplication;
}

export async function rejectPropertyApplicationForCurrentLandlord(params: {
  applicationId: string;
  reason: string;
}) {
  const { landlord, supabase, application } =
    await getReviewableApplicationForCurrentLandlord(params.applicationId);

  const updatedApplication = await updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "rejected_by_landlord",
    reason: params.reason,
    decidedBy: landlord.id,
  });

  await queueTenantOutcomeWhatsapp({
    landlordId: landlord.id,
    tenantId: null,
    messageBody: buildTenantRejectedMessage({
      tenantName: "Applicant",
      propertyName: "the selected property",
      unitIdentifier: "the selected unit",
      reason: params.reason,
    }),
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationRejected,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: application.id,
    description: "Property application was rejected by landlord.",
    metadata: {
      reason: params.reason,
      tenant_kyc_profile_id: application.tenant_kyc_profile_id,
      agent_property_listing_id: application.agent_property_listing_id,
      agent_id: application.agent_id,
      previous_status: application.status,
      new_status: updatedApplication.status,
    },
  });

  return updatedApplication;
}

export async function waitlistPropertyApplicationForCurrentLandlord(params: {
  applicationId: string;
  reason: string;
}) {
  const { landlord, supabase, application } =
    await getReviewableApplicationForCurrentLandlord(params.applicationId);

  const updatedApplication = await updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "waitlisted",
    reason: params.reason,
    decidedBy: landlord.id,
  });

  await queueTenantOutcomeWhatsapp({
    landlordId: landlord.id,
    tenantId: null,
    messageBody: buildTenantWaitlistedMessage({
      tenantName: "Applicant",
      propertyName: "the selected property",
      unitIdentifier: "the selected unit",
      reason: params.reason,
    }),
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationWaitlisted,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: application.id,
    description: "Property application was waitlisted by landlord.",
    metadata: {
      reason: params.reason,
      tenant_kyc_profile_id: application.tenant_kyc_profile_id,
      agent_property_listing_id: application.agent_property_listing_id,
      agent_id: application.agent_id,
      previous_status: application.status,
      new_status: updatedApplication.status,
    },
  });

  return updatedApplication;
}

export async function markAcceptedPropertyApplicationRejectedByTenant(params: {
  applicationId: string;
  reason: string;
}) {
  const { landlord, supabase, application, convertedTenantId } =
    await getAcceptedApplicationForCurrentLandlord(params.applicationId);

  const tenant = await getTenantById(supabase, convertedTenantId);

  if (tenant.landlord_id !== landlord.id) {
    throw new AppError(
      "TENANT_LANDLORD_MISMATCH",
      "This tenant does not belong to your landlord account.",
      403,
    );
  }

  if (tenant.source_property_application_id !== application.id) {
    throw new AppError(
      "TENANT_APPLICATION_MISMATCH",
      "This tenant was not created from this property application.",
      400,
    );
  }

  const activeTenancy = await getActiveTenancyForUnit(supabase, tenant.unit_id);

  if (activeTenancy) {
    throw new AppError(
      "ACTIVE_TENANCY_EXISTS",
      "This tenant already has an active tenancy. Cancel or terminate the tenancy before releasing this application.",
      400,
    );
  }

  const rejectedTenant = await markTenantRejectedAfterInspection(supabase, {
    tenantId: tenant.id,
    reason: params.reason,
  });

  const unit = await getUnitById(supabase, tenant.unit_id);
  const releasedUnit =
    unit.status === "reserved" ? await markUnitVacant(supabase, unit.id) : null;

  const updatedApplication = await updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "rejected_by_tenant_after_inspection",
    convertedTenantId,
    tenantDecisionReason: params.reason,
    decidedBy: landlord.id,
  });

  await writeApplicationDecisionAudit({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    applicationId: application.id,
    tenantId: tenant.id,
    unitId: tenant.unit_id,
    propertyId: tenant.units?.properties?.id ?? null,
    eventType: AUDIT_EVENT_TYPES.propertyApplicationTenantRejected,
    entityType: AUDIT_ENTITY_TYPES.propertyApplication,
    entityId: application.id,
    description:
      "Tenant rejected the apartment after inspection or agreement review.",
    metadata: {
      reason: params.reason,
      tenant_id: tenant.id,
      previous_tenant_status: tenant.onboarding_status,
      new_tenant_status: rejectedTenant.onboarding_status,
      previous_application_status: application.status,
      new_application_status: updatedApplication.status,
      unit_released: Boolean(releasedUnit),
    },
  });

  if (releasedUnit) {
    await writeApplicationDecisionAudit({
      landlordId: landlord.id,
      actorProfileId: landlord.id,
      applicationId: application.id,
      tenantId: tenant.id,
      unitId: unit.id,
      propertyId: tenant.units?.properties?.id ?? null,
      eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
      entityType: AUDIT_ENTITY_TYPES.unit,
      entityId: unit.id,
      description: `${unit.unit_identifier} was released after tenant rejected the apartment.`,
      metadata: {
        reason: "tenant_rejected_apartment",
        tenant_id: tenant.id,
        tenant_name: tenant.full_name,
        previous_unit_status: unit.status,
        new_unit_status: releasedUnit.status,
        property_application_id: application.id,
      },
    });
  }

  return updatedApplication;
}
