export type ManagerTenantOnboardingActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  tenantId?: string;
  agreementId?: string;
  paymentRequestId?: string;
  claimUrl?: string;
  agreementUrl?: string;
  paymentUrl?: string;
  paymentExpiresAt?: string;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
};

export const initialManagerTenantOnboardingActionState: ManagerTenantOnboardingActionState =
  {
    ok: false,
    message: "",
    fieldErrors: undefined,
  };
