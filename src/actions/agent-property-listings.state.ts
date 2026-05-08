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

export type AgentLandlordVerificationActionState = {
  ok: boolean;
  message: string;
  verificationUrl?: string;
  whatsappUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgentLandlordVerificationActionState: AgentLandlordVerificationActionState =
  {
    ok: false,
    message: "",
  };

export type PublicLandlordVerificationActionState = {
  ok: boolean;
  message: string;
  nextAction: "sign_in" | "add_units" | null;
  claimUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialPublicLandlordVerificationActionState: PublicLandlordVerificationActionState =
  {
    ok: false,
    message: "",
    nextAction: null,
  };

export type LandlordClaimSignupActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialLandlordClaimSignupActionState: LandlordClaimSignupActionState =
  {
    ok: false,
    message: "",
  };
