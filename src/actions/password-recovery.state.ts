import type { AuthActionState } from "@/server/types/auth.types";

export const initialPasswordRecoveryActionState: AuthActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
  redirectTo: undefined,
};
