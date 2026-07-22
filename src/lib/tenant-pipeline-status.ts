import type { StatusTone } from "@/lib/status-copy";
import { isSubmittedForLandlordReview } from "@/server/constants/onboarding-lifecycle";
import type { TenantOnboardingStatus } from "@/server/repositories/tenants.repository";

export type TenantPipelinePhase =
  | "onboarding"
  | "review"
  | "agreement_setup"
  | "awaiting_agreement"
  | "agreement_sent"
  | "agreement_accepted"
  | "active";

export type TenantPipelineStatus = {
  label: string;
  tone: StatusTone;
  phase: TenantPipelinePhase;
};

export function resolveTenantPipelineStatus(params: {
  onboardingStatus: TenantOnboardingStatus;
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
}): TenantPipelineStatus {
  if (params.onboardingStatus === "invited") {
    return {
      label: "Waiting for tenant",
      tone: "warning",
      phase: "onboarding",
    };
  }

  if (params.onboardingStatus === "documents_submitted") {
    return {
      label: "Awaiting verification payment",
      tone: "warning",
      phase: "onboarding",
    };
  }

  if (isSubmittedForLandlordReview(params.onboardingStatus)) {
    return {
      label: "Waiting for your review",
      tone: "primary",
      phase: "review",
    };
  }

  if (params.onboardingStatus === "waitlisted") {
    return {
      label: "Waitlisted",
      tone: "neutral",
      phase: "review",
    };
  }

  if (params.onboardingStatus === "rejected") {
    return {
      label: "Rejected",
      tone: "danger",
      phase: "onboarding",
    };
  }

  if (params.onboardingStatus === "token_expired") {
    return {
      label: "Invite expired",
      tone: "danger",
      phase: "onboarding",
    };
  }

  if (params.isOperationallyLive) {
    return {
      label: "Active",
      tone: "success",
      phase: "active",
    };
  }

  if (params.onboardingStatus === "approved" && !params.isAgreementSetup) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "agreement_setup",
    };
  }

  if (params.isAgreementSetup && !params.chargesConfirmed) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "awaiting_agreement",
    };
  }

  if (params.isAgreementSetup && params.chargesConfirmed) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "awaiting_agreement",
    };
  }

  if (params.agreementDocumentStatus === "accepted") {
    return {
      label: "Agreement accepted",
      tone: "success",
      phase: "agreement_accepted",
    };
  }

  if (
    params.agreementDocumentStatus === "sent_to_tenant" ||
    params.agreementDocumentStatus === "finalized"
  ) {
    return {
      label: "Agreement sent",
      tone: "warning",
      phase: "agreement_sent",
    };
  }

  if (
    params.isAgreementSetup ||
    params.agreementDocumentStatus === "draft"
  ) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "awaiting_agreement",
    };
  }

  return {
    label: "Approved",
    tone: "success",
    phase: "active",
  };
}
