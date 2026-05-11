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

export type PublicAgreementSignupActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialPublicAgreementSignupActionState: PublicAgreementSignupActionState =
  {
    ok: false,
    message: "",
  };
