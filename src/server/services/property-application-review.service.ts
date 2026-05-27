import "server-only";

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
  getTenantBySourcePropertyApplicationId,
  type TenantIdType,
} from "@/server/repositories/tenants.repository";
import {
  getUnitById,
  markUnitReserved,
} from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";

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
    return updatePropertyApplicationStatus(supabase, {
      applicationId: application.id,
      status: "accepted",
      convertedTenantId: existingTenant.id,
      decidedBy: landlord.id,
    });
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

  await markUnitReserved(supabase, unit.id);

  return updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "accepted",
    convertedTenantId: tenant.id,
    decidedBy: landlord.id,
  });
}

export async function rejectPropertyApplicationForCurrentLandlord(params: {
  applicationId: string;
  reason: string;
}) {
  const { landlord, supabase, application } =
    await getReviewableApplicationForCurrentLandlord(params.applicationId);

  return updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "rejected_by_landlord",
    reason: params.reason,
    decidedBy: landlord.id,
  });
}

export async function waitlistPropertyApplicationForCurrentLandlord(params: {
  applicationId: string;
  reason: string;
}) {
  const { landlord, supabase, application } =
    await getReviewableApplicationForCurrentLandlord(params.applicationId);

  return updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "waitlisted",
    reason: params.reason,
    decidedBy: landlord.id,
  });
}
