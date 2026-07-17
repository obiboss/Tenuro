export type ManagerTenantPaymentBreakdownState = {
  currencyCode: "NGN";
  rentAmount: number;
  serviceChargeItems: Array<{
    chargeId: string;
    code: string | null;
    name: string;
    amount: number;
    currencyCode: "NGN";
  }>;
  serviceChargeTotal: number;
  bopaPlatformFee: number;
  paystackCharge: number;
  otherCharges: number;
  managerCommission: number;
  landlordShare: number;
  totalPayable: number;
  collectionMode: "automatic_split" | "manager_collects" | "landlord_direct";
  paystackChargeBearer: "tenant" | "landlord" | "manager" | "bopa";
};

export type ManagerGuarantorShareState = {
  guarantorId: string;
  fullName: string;
  phoneNumber: string;
  confirmationUrl: string;
  whatsappMessage: string;
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
  pdfDownloadUrl?: string | null;
  paymentUrl?: string | null;
  paymentExpiresAt?: string | null;
  paymentBreakdown?: ManagerTenantPaymentBreakdownState | null;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  screeningResult?: "not_screened" | "eligible" | "review" | "declined";
  guarantorId?: string;
  guarantorLinks?: ManagerGuarantorShareState[];
  guarantorConfirmed?: boolean;
  agreementDeclined?: boolean;
};

export const initialManagerTenantOnboardingActionState: ManagerTenantOnboardingActionState =
  {
    ok: false,
    message: "",
    fieldErrors: undefined,
  };
