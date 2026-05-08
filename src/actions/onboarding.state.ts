export type TenantOnboardingActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialTenantOnboardingActionState: TenantOnboardingActionState = {
  ok: false,
  message: "",
};
