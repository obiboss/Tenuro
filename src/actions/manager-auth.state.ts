import type { AuthActionState } from "@/server/types/auth.types";

export const initialManagerAuthActionState: AuthActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
};
