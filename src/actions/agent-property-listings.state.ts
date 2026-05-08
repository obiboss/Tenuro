export type AgentPropertyListingActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgentPropertyListingActionState: AgentPropertyListingActionState =
  {
    ok: false,
    message: "",
  };
