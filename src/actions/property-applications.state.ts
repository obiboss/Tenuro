export type PropertyApplicationDecisionActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialPropertyApplicationDecisionActionState: PropertyApplicationDecisionActionState =
  {
    ok: false,
    message: "",
  };
