export type ManagerActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialManagerActionState: ManagerActionState = {
  ok: false,
  message: "",
  fieldErrors: undefined,
};
