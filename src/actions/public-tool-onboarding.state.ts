export type PublicReceiptSignupActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialPublicReceiptSignupActionState: PublicReceiptSignupActionState =
  {
    ok: false,
    message: "",
  };
