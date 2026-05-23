export type LandlordSubscriptionGateUiState = {
  title: string;
  description: string;
  tone: "warning" | "danger";
  settingsHref: string;
};

export function buildLandlordSubscriptionGateUiState(params: {
  reason: "trial_expired" | "subscription_inactive";
}): LandlordSubscriptionGateUiState {
  if (params.reason === "trial_expired") {
    return {
      title: "Your free trial has ended",
      description:
        "Subscribe to BOPA Basic or BOPA Pro to continue managing properties, tenants, and payments.",
      tone: "warning",
      settingsHref: "/settings?subscription=required#bopa-plans",
    };
  }

  return {
    title: "Subscription required",
    description:
      "An active BOPA Basic or BOPA Pro subscription is required to use this workspace.",
    tone: "danger",
    settingsHref: "/settings?subscription=required#bopa-plans",
  };
}

const LANDLORD_SUBSCRIPTION_ERROR_CODES = new Set([
  "LANDLORD_SUBSCRIPTION_REQUIRED",
]);

export function getLandlordSubscriptionGateUiStateFromErrorCode(
  code: string,
): LandlordSubscriptionGateUiState | null {
  if (!LANDLORD_SUBSCRIPTION_ERROR_CODES.has(code)) {
    return null;
  }

  return buildLandlordSubscriptionGateUiState({
    reason: "subscription_inactive",
  });
}
