export type DeveloperPayoutSetupActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: {
    bankCode?: string[];
    bankName?: string[];
    accountNumber?: string[];
  };
};

export const initialDeveloperPayoutSetupActionState: DeveloperPayoutSetupActionState =
  {
    ok: false,
    message: "",
  };
