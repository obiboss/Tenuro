import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getPropertyApplicationsForLandlordReview } from "@/server/repositories/property-application-review.repository";
import {
  getPropertyApplicationById,
  updatePropertyApplicationStatus,
} from "@/server/repositories/tenant-applications.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";

const REVIEWABLE_APPLICATION_STATUSES = [
  "submitted_for_landlord_review",
  "waitlisted",
] as const;

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

  return updatePropertyApplicationStatus(supabase, {
    applicationId: application.id,
    status: "accepted",
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
