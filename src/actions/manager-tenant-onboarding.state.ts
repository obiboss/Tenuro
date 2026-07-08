export type ManagerTenantPaymentBreakdownState = {
  currencyCode: "NGN";
  rentAmount: number;
  bopaPlatformFee: number;
  paystackCharge: number;
  otherCharges: number;
  managerCommission: number;
  landlordShare: number;
  totalPayable: number;
  collectionMode: "automatic_split" | "manager_collects" | "landlord_direct";
  paystackChargeBearer: "tenant" | "landlord" | "manager" | "bopa";
};

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
  paymentUrl?: string | null;
  paymentExpiresAt?: string | null;
  paymentBreakdown?: ManagerTenantPaymentBreakdownState | null;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  agreementDeclined?: boolean;
};

export const initialManagerTenantOnboardingActionState: ManagerTenantOnboardingActionState =
  {
    ok: false,
    message: "",
    fieldErrors: undefined,
  };
