export const TENANT_ONBOARDING_STATUSES = {
  invited: "invited",
  documentsSubmitted: "documents_submitted",
  profileComplete: "profile_complete",
  submittedForLandlordReview: "submitted_for_landlord_review",
  waitlisted: "waitlisted",
  approved: "approved",
  rejected: "rejected",
  tokenExpired: "token_expired",
} as const;

export type TenantOnboardingLifecycleStatus =
  (typeof TENANT_ONBOARDING_STATUSES)[keyof typeof TENANT_ONBOARDING_STATUSES];

export function isAgentSourcedTenant(params: {
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  return Boolean(params.agentPropertyListingId && params.invitedByAgentId);
}

export function isLandlordSourcedTenant(params: {
  agentPropertyListingId: string | null;
  invitedByAgentId: string | null;
}) {
  return !isAgentSourcedTenant(params);
}

/** Draft saved; awaiting verification payment before official submission. */
export function isOnboardingDraftStatus(status: string) {
  return status === TENANT_ONBOARDING_STATUSES.documentsSubmitted;
}

/** @deprecated Use isOnboardingDraftStatus */
export function isAgentOnboardingDraftStatus(status: string) {
  return isOnboardingDraftStatus(status);
}

/** Ready for landlord review (includes legacy profile_complete). */
export function isSubmittedForLandlordReview(status: string) {
  return (
    status === TENANT_ONBOARDING_STATUSES.profileComplete ||
    status === TENANT_ONBOARDING_STATUSES.submittedForLandlordReview
  );
}

/** Landlord may review, approve, reject, or waitlist. */
export function isLandlordReviewEligible(status: string) {
  return (
    isSubmittedForLandlordReview(status) ||
    status === TENANT_ONBOARDING_STATUSES.waitlisted ||
    status === TENANT_ONBOARDING_STATUSES.rejected
  );
}

/** Token page remains accessible while the tenant completes the flow. */
export function isOnboardingTokenFlowActive(status: string) {
  return (
    status === TENANT_ONBOARDING_STATUSES.invited ||
    status === TENANT_ONBOARDING_STATUSES.documentsSubmitted ||
    status === TENANT_ONBOARDING_STATUSES.profileComplete ||
    status === TENANT_ONBOARDING_STATUSES.submittedForLandlordReview
  );
}

/** Uploads remain allowed until official submission. */
export function isOnboardingEditable(status: string) {
  return (
    status === TENANT_ONBOARDING_STATUSES.invited ||
    status === TENANT_ONBOARDING_STATUSES.documentsSubmitted
  );
}

export function normalizeOnboardingStatusForDisplay(status: string) {
  if (status === TENANT_ONBOARDING_STATUSES.profileComplete) {
    return TENANT_ONBOARDING_STATUSES.submittedForLandlordReview;
  }

  return status;
}
