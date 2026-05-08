export type TenantOnboardingActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialTenantOnboardingActionState: TenantOnboardingActionState = {
  ok: false,
  message: "",
};

export type OnboardingInviteActionState = {
  ok: boolean;
  message: string;
  onboardingUrl?: string;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialOnboardingInviteActionState: OnboardingInviteActionState = {
  ok: false,
  message: "",
};
