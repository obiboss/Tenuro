export const AUDIT_ACTOR_ROLES = {
  system: "system",
  landlord: "landlord",
  tenant: "tenant",
} as const;

export const AUDIT_ENTITY_TYPES = {
  tenant: "tenant",
  tenancy: "tenancy",
  unit: "unit",
  property: "property",
  payment: "payment",
  agreement: "agreement",
  receipt: "receipt",
  bankAccount: "bank_account",
  onboarding: "onboarding",
  activation: "activation",
} as const;

export const AUDIT_EVENT_TYPES = {
  tenantCreated: "tenant.created",
  onboardingLinkSent: "tenant.onboarding_link_sent",
  tenantKycSubmitted: "tenant.kyc_submitted",
  tenantApproved: "tenant.approved",
  tenantRejected: "tenant.rejected",
  tenancyCreated: "tenancy.created",
  agreementGenerated: "agreement.generated",
  agreementSaved: "agreement.saved",
  agreementFinalized: "agreement.finalized",
  agreementAccepted: "agreement.accepted",
  paymentLinkSent: "payment.link_sent",
  manualPaymentRecorded: "payment.manual_recorded",
  gatewayPaymentVerified: "payment.gateway_verified",
  receiptGenerated: "receipt.generated",
  tenantAccountActivated: "tenant.account_activated",
  bankAccountSetup: "bank_account.setup",
} as const;

export type AuditActorRole =
  (typeof AUDIT_ACTOR_ROLES)[keyof typeof AUDIT_ACTOR_ROLES];

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

export type AuditEventType =
  (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];
