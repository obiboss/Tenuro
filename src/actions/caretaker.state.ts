export type CaretakerInviteActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  inviteUrl?: string;
  whatsappMessage?: string;
  caretakerPhone?: string;
};

export const initialCaretakerInviteActionState: CaretakerInviteActionState = {
  ok: false,
};

export type CaretakerAcceptActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialCaretakerAcceptActionState: CaretakerAcceptActionState = {
  ok: false,
};

export type CaretakerRevokeActionState = {
  ok: boolean;
  message?: string;
};

export const initialCaretakerRevokeActionState: CaretakerRevokeActionState = {
  ok: false,
};

export type CaretakerProofRequestActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  proofUrl?: string;
  whatsappMessage?: string;
  tenantPhone?: string | null;
};

export const initialCaretakerProofRequestActionState: CaretakerProofRequestActionState =
  {
    ok: false,
  };

export type CaretakerReportPaymentActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialCaretakerReportPaymentActionState: CaretakerReportPaymentActionState =
  {
    ok: false,
  };

export type TenantPaymentProofActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialTenantPaymentProofActionState: TenantPaymentProofActionState =
  {
    ok: false,
  };

export type CaretakerPaymentClaimDecisionActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialCaretakerPaymentClaimDecisionActionState: CaretakerPaymentClaimDecisionActionState =
  {
    ok: false,
  };
