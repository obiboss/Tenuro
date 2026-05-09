export type LandlordTenancyChargeActionState = {
  ok: boolean;
  message: string;
  chargeId?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialLandlordTenancyChargeActionState: LandlordTenancyChargeActionState =
  {
    ok: false,
    message: "",
  };
