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
