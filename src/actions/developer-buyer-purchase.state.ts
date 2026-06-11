export type DeveloperBuyerPurchaseActionState = {
  ok: boolean;
  message: string;
  purchaseUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialDeveloperBuyerPurchaseActionState: DeveloperBuyerPurchaseActionState =
  {
    ok: false,
    message: "",
  };
