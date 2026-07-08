export type ManagerActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  propertyId?: string;
  landlordClientId?: string;
  unitId?: string;
  nextHref?: string;
  submissionId?: string;
};

export const initialManagerActionState: ManagerActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
};
