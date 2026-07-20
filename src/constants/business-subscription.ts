export const BUSINESS_SUBSCRIPTION_TRIAL_MONTHS = 2;

export const BUSINESS_SUBSCRIPTION_PRICES = {
  monthly: {
    amountKobo: 7_000_000,
    amountNaira: 70_000,
    label: "Monthly",
  },
  annual: {
    amountKobo: 60_000_000,
    amountNaira: 600_000,
    label: "Yearly",
  },
} as const;

export const BUSINESS_SUBSCRIPTION_ANNUAL_SAVING_NAIRA = 240_000;

export type BusinessWorkspaceType = "manager" | "developer";
export type BusinessBillingInterval = keyof typeof BUSINESS_SUBSCRIPTION_PRICES;
