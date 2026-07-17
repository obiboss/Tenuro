export type PropertyRuleActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialPropertyRuleActionState: PropertyRuleActionState = {
  ok: false,
  message: "",
};
