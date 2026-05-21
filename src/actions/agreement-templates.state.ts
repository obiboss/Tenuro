export type AgreementTemplateActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAgreementTemplateActionState: AgreementTemplateActionState =
  {
    ok: false,
    message: "",
  };
