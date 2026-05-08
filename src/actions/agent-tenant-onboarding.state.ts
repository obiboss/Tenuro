export type AgentTenantOnboardingActionState = {
  ok: boolean;
  message: string;
  onboardingUrl?: string;
  whatsappUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgentTenantOnboardingActionState: AgentTenantOnboardingActionState =
  {
    ok: false,
    message: "",
  };
