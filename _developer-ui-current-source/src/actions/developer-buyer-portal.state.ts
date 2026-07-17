export type DeveloperBuyerPortalActionState = {
  ok: boolean;
  message: string;
  portalUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialDeveloperBuyerPortalActionState: DeveloperBuyerPortalActionState =
  {
    ok: false,
    message: "",
  };
