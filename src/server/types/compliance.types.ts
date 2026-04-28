export type LandlordComplianceStatus =
  | "active"
  | "warned"
  | "grace_period"
  | "restricted"
  | "suspended";

export type RestrictedFeature =
  | "send_reminders"
  | "generate_receipts"
  | "onboard_tenants"
  | "access_renewal_queue"
  | "view_financial_reports"
  | "create_tenancies";

export type ComplianceDecision = {
  status: LandlordComplianceStatus;
  restrictedFeatures: RestrictedFeature[];
  reason: string | null;
};

export type ComplianceActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
