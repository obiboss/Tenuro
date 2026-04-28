export const NOTIFICATION_CHANNELS = {
  whatsapp: "whatsapp",
  sms: "sms",
  email: "email",
  inApp: "in_app",
} as const;

export const NOTIFICATION_TYPES = {
  onboardingInvite: "onboarding_invite",
  rentDue: "rent_due",
  overdue: "overdue",
  receipt: "receipt",
  renewalNotice: "renewal_notice",
  incrementNotice: "increment_notice",
  balanceConfirmation: "balance_confirmation",
  custom: "custom",
} as const;
