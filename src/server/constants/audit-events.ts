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
  quitNotice: "quit_notice",
} as const;

export const AUDIT_EVENT_TYPES = {
  tenantCreated: "tenant.created",
  onboardingLinkSent: "tenant.onboarding_link_sent",
  tenantKycSubmitted: "tenant.kyc_submitted",
  tenantApproved: "tenant.approved",
  tenantRejected: "tenant.rejected",
  tenantUpdated: "tenant.updated",
  tenantArchived: "tenant.archived",
  tenantAccountActivated: "tenant.account_activated",

  tenancyCreated: "tenancy.created",
  tenancyMoveOutConfirmed: "tenancy.move_out_confirmed",
  rentChargePosted: "tenancy.rent_charge_posted",
  renewalReminderPrepared: "tenancy.renewal_reminder_prepared",

  agreementGenerated: "agreement.generated",
  agreementSaved: "agreement.saved",
  agreementFinalized: "agreement.finalized",
  agreementAccepted: "agreement.accepted",
  agreementAcceptanceLinkRefreshed: "agreement.acceptance_link_refreshed",

  paymentLinkSent: "payment.link_sent",
  paymentLinkExpired: "payment.link_expired",
  manualPaymentRecorded: "payment.manual_recorded",
  gatewayPaymentVerified: "payment.gateway_verified",
  gatewayPaymentFailed: "payment.gateway_failed",
  gatewayPaymentIgnored: "payment.gateway_ignored",

  receiptGenerated: "receipt.generated",
  receiptWhatsappPrepared: "receipt.whatsapp_prepared",

  bankAccountSetup: "bank_account.setup",

  propertyCreated: "property.created",
  propertyUpdated: "property.updated",
  propertyArchived: "property.archived",

  unitCreated: "unit.created",
  unitUpdated: "unit.updated",
  unitArchived: "unit.archived",
  unitStatusChanged: "unit.status_changed",

  quitNoticeDrafted: "quit_notice.drafted",
  quitNoticeIssued: "quit_notice.issued",
  quitNoticeDownloaded: "quit_notice.downloaded",
  quitNoticeSentPrepared: "quit_notice.sent_prepared",
  quitNoticeWithdrawn: "quit_notice.withdrawn",
  quitNoticeAcknowledged: "quit_notice.acknowledged",
  tenantMoveOutRequested: "tenant.move_out_requested",
} as const;

export type AuditActorRole =
  (typeof AUDIT_ACTOR_ROLES)[keyof typeof AUDIT_ACTOR_ROLES];

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

export type AuditEventType =
  (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];
