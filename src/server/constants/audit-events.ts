export const AUDIT_ACTOR_ROLES = {
  system: "system",
  landlord: "landlord",
  tenant: "tenant",
  agent: "agent",
  platformAdmin: "platform_admin",
} as const;

export const AUDIT_ENTITY_TYPES = {
  tenant: "tenant",
  tenancy: "tenancy",
  unit: "unit",
  property: "property",
  propertyRule: "property_rule",
  propertyApplication: "property_application",
  agentPropertyListing: "agent_property_listing",
  payment: "payment",
  agreement: "agreement",
  agreementTemplate: "agreement_template",
  receipt: "receipt",
  bankAccount: "bank_account",
  onboarding: "onboarding",
  activation: "activation",
  quitNotice: "quit_notice",
  platformSettings: "platform_settings",
} as const;

export const AUDIT_EVENT_TYPES = {
  tenantCreated: "tenant.created",
  onboardingLinkSent: "tenant.onboarding_link_sent",
  tenantKycSubmitted: "tenant.kyc_submitted",
  tenantAutoDeclined: "tenant.auto_declined",
  tenantKycFlaggedForReview: "tenant.kyc_flagged_for_review",
  tenantApproved: "tenant.approved",
  tenantRejected: "tenant.rejected",
  tenantWaitlisted: "tenant.waitlisted",

  propertyApplicationCreated: "property_application.created",
  propertyApplicationSubmitted: "property_application.submitted",
  propertyApplicationFeeConfirmed: "property_application.fee_confirmed",
  propertyApplicationAccepted: "property_application.accepted",
  propertyApplicationRejected: "property_application.rejected",
  propertyApplicationWaitlisted: "property_application.waitlisted",
  propertyApplicationTenantRejected:
    "property_application.tenant_rejected_apartment",
  propertyApplicationConvertedToTenant:
    "property_application.converted_to_tenant",

  agentKycDraftSaved: "agent.kyc_draft_saved",
  agentVerificationFeeInitialized: "agent.verification_fee_initialized",
  agentVerificationFeePaid: "agent.verification_fee_paid",
  agentOnboardingSubmitted: "agent.onboarding_submitted",

  landlordTrialStarted: "landlord.trial_started",
  landlordVerificationFeeInitialized: "landlord.verification_fee_initialized",
  landlordVerificationFeePaid: "landlord.verification_fee_paid",
  landlordOnboardingSubmitted: "landlord.onboarding_submitted",
  landlordWaitlisted: "landlord.waitlisted",
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
  agreementTemplateSaved: "agreement.template_saved",

  paymentLinkSent: "payment.link_sent",
  paymentLinkExpired: "payment.link_expired",
  manualPaymentRecorded: "payment.manual_recorded",
  gatewayPaymentVerified: "payment.gateway_verified",
  gatewayPaymentFailed: "payment.gateway_failed",
  gatewayPaymentIgnored: "payment.gateway_ignored",

  platformPaymentSettingsUpdated: "platform.payment_settings_updated",

  receiptGenerated: "receipt.generated",
  receiptWhatsappPrepared: "receipt.whatsapp_prepared",

  bankAccountSetup: "bank_account.setup",
  payoutAccountCreated: "bank_account.payout_created",
  payoutVerificationPending: "bank_account.paystack_verification_pending",

  propertyCreated: "property.created",
  propertyUpdated: "property.updated",
  propertyArchived: "property.archived",

  propertyRuleCreated: "property_rule.created",
  propertyRuleUpdated: "property_rule.updated",
  propertyRuleArchived: "property_rule.archived",

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
