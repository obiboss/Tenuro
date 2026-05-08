export type AgentProfileActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgentProfileActionState: AgentProfileActionState = {
  ok: false,
  message: "",
};

export type AgentBankSetupActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgentBankSetupActionState: AgentBankSetupActionState = {
  ok: false,
  message: "",
};
