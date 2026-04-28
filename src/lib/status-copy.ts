export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "primary";

export const TENANCY_STATUS_COPY: Record<
  string,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  active: {
    label: "Active",
    tone: "success",
  },
  expired: {
    label: "Expired",
    tone: "neutral",
  },
  terminated: {
    label: "Ended",
    tone: "neutral",
  },
  pending_renewal: {
    label: "Renewal Soon",
    tone: "warning",
  },
  notice_given: {
    label: "Moving Out",
    tone: "warning",
  },
  hold: {
    label: "On Hold",
    tone: "warning",
  },
  special_case: {
    label: "Special Situation",
    tone: "primary",
  },
  archived: {
    label: "Archived",
    tone: "neutral",
  },
};

export const TENANT_ONBOARDING_STATUS_COPY: Record<
  string,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  invited: {
    label: "Waiting for tenant",
    tone: "warning",
  },
  profile_complete: {
    label: "Waiting for your review",
    tone: "primary",
  },
  approved: {
    label: "Approved",
    tone: "success",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
  },
  token_expired: {
    label: "Invite expired",
    tone: "danger",
  },
};

export const PAYMENT_STATUS_COPY: Record<
  string,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  pending: {
    label: "Receipt is being prepared",
    tone: "warning",
  },
  generated: {
    label: "Receipt ready",
    tone: "success",
  },
  failed: {
    label: "Receipt failed",
    tone: "danger",
  },
  voided: {
    label: "Voided",
    tone: "neutral",
  },
};
