export const OFFLINE_SAVED_MESSAGE =
  "Saved on this device. BOPA will sync it automatically when your internet returns.";

export const OFFLINE_SAVED_EVENT = "bopa:offline-saved";

export type OfflineSavedEventDetail = {
  message: string;
  submissionId: string;
};

export function announceOfflineSaved(detail: OfflineSavedEventDetail) {
  window.dispatchEvent(
    new CustomEvent<OfflineSavedEventDetail>(OFFLINE_SAVED_EVENT, { detail }),
  );
}
