export type DemoRequestActionState = {
  ok: boolean;
  message: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialDemoRequestActionState: DemoRequestActionState = {
  ok: false,
  message: "",
};

export type PlatformAdminDemoRequestActionState = {
  ok: boolean;
  message: string;
};

export const initialPlatformAdminDemoRequestActionState: PlatformAdminDemoRequestActionState =
  {
    ok: false,
    message: "",
  };
