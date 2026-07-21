export type ManagerActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  propertyId?: string;
  landlordClientId?: string;
  unitId?: string;
  tenantId?: string;
  paymentId?: string;
  requestId?: string;
  nextHref?: string;
  submissionId?: string;
  offlineSaved?: boolean;
};

export const initialManagerActionState: ManagerActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
};
