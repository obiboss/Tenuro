import type { StatusTone } from "@/lib/status-copy";
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
  tenancyStatus: "draft" | "active" | "expired" | "terminated" | "archived" | null;
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

  if (params.onboardingStatus === "profile_complete") {
    return {
      label: "Waiting for your review",
      tone: "primary",
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

  if (
    params.onboardingStatus === "approved" &&
    !params.tenancyStatus
  ) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "agreement_setup",
    };
  }

  if (
    params.tenancyStatus === "draft" &&
    !params.chargesConfirmed
  ) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "awaiting_agreement",
    };
  }

  if (
    params.tenancyStatus === "draft" &&
    params.chargesConfirmed &&
    !params.agreementDocumentStatus
  ) {
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
    params.tenancyStatus === "draft" ||
    params.agreementDocumentStatus === "draft"
  ) {
    return {
      label: "Awaiting Agreement",
      tone: "primary",
      phase: "awaiting_agreement",
    };
  }

  return {
    label: "Active",
    tone: "success",
    phase: "active",
  };
}
