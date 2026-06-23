export type DeveloperBuyerPurchaseActionState = {
  ok: boolean;
  message: string;
  purchaseUrl?: string;
  buyerPhone?: string;
  buyerName?: string;
  companyName?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialDeveloperBuyerPurchaseActionState: DeveloperBuyerPurchaseActionState =
  {
    ok: false,
    message: "",
  };
