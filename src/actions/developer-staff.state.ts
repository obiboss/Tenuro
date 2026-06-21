import type { AuthActionState } from "@/server/types/auth.types";

export type DeveloperStaffRoleLinkActionState = AuthActionState & {
  onboardingUrl?: string | null;
  staffTitleLabel?: string | null;
};

export const initialDeveloperStaffRoleLinkActionState: DeveloperStaffRoleLinkActionState =
  {
    ok: false,
    message: "",
    fieldErrors: undefined,
    onboardingUrl: null,
    staffTitleLabel: null,
  };

export const initialDeveloperStaffAcceptActionState: AuthActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
};
