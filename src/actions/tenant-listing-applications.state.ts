export type TenantListingApplicationActionState = {
  ok: boolean;
  message: string;
  requiresProcessingFee?: boolean;
  applicationId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialTenantListingApplicationActionState: TenantListingApplicationActionState =
  {
    ok: false,
    message: "",
  };
