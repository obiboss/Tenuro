export type QuitNoticeActionState = {
  ok: boolean;
  message: string;
  quitNoticeId?: string;
  pdfDownloadUrl?: string | null;
  whatsappUrl?: string;
  whatsappMessage?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialQuitNoticeActionState: QuitNoticeActionState = {
  ok: false,
  message: "",
};

export type TenantMoveOutNoticeActionState = {
  ok: boolean;
  message: string;
  quitNoticeId?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialTenantMoveOutNoticeActionState: TenantMoveOutNoticeActionState =
  {
    ok: false,
    message: "",
  };

export type ConfirmMoveOutActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialConfirmMoveOutActionState: ConfirmMoveOutActionState = {
  ok: false,
  message: "",
};
