export type ExistingTenantClaimActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  claimId?: string;
  claimUrl?: string;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  expiresAt?: string;
};

export const initialExistingTenantClaimActionState: ExistingTenantClaimActionState =
  {
    ok: false,
    message: "",
  };
