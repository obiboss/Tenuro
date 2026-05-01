import type {
  OnboardingInviteActionState,
  TenantOnboardingActionState,
} from "@/actions/onboarding.actions";

export const initialOnboardingInviteActionState: OnboardingInviteActionState = {
  ok: false,
  message: "",
};

export const initialTenantOnboardingActionState: TenantOnboardingActionState = {
  ok: false,
  message: "",
};
