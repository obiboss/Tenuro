export type LandlordPaymentGateUiState = {
  title: string;
  description: string;
  showAddBankCta: boolean;
  showUpdateBankCta: boolean;
  tone: "warning" | "danger" | "neutral";
};

export type LandlordPaymentGateState = "missing" | "unverified" | "failed";

export function buildLandlordPaymentGateUiState(
  state: LandlordPaymentGateState,
): LandlordPaymentGateUiState {
  if (state === "missing") {
    return {
      title: "Bank account required",
      description:
        "You need to add and verify your bank account before you can generate payment links.",
      showAddBankCta: true,
      showUpdateBankCta: false,
      tone: "neutral",
    };
  }

  if (state === "unverified") {
    return {
      title: "Bank account pending verification",
      description:
        "Your bank account is pending admin verification. You'll be able to generate payment links once approved.",
      showAddBankCta: false,
      showUpdateBankCta: false,
      tone: "warning",
    };
  }

  return {
    title: "Payout verification failed",
    description:
      "Your payout account verification failed. Please update your bank details.",
    showAddBankCta: false,
    showUpdateBankCta: true,
    tone: "danger",
  };
}

const LANDLORD_PAYOUT_ERROR_GATE_STATE: Record<
  string,
  LandlordPaymentGateState
> = {
  BANK_ACCOUNT_REQUIRED: "missing",
  PAYOUT_ACCOUNT_PENDING_VERIFICATION: "unverified",
  PAYOUT_ACCOUNT_VERIFICATION_FAILED: "failed",
};

export function getLandlordPaymentGateUiStateFromErrorCode(
  code: string,
): LandlordPaymentGateUiState | null {
  const state = LANDLORD_PAYOUT_ERROR_GATE_STATE[code];

  if (!state) {
    return null;
  }

  return buildLandlordPaymentGateUiState(state);
}
