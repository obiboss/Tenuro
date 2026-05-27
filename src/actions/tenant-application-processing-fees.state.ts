export type TenantApplicationProcessingFeeActionState = {
  ok: boolean;
  message: string;
  authorizationUrl?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialTenantApplicationProcessingFeeActionState: TenantApplicationProcessingFeeActionState =
  {
    ok: false,
    message: "",
  };
