export type MetaDocumentDownloadEvent =
  | "ReceiptDownload"
  | "TenancyAgreementDownload";

export const META_DOCUMENT_DOWNLOAD_EVENT = "bopa:meta-document-download";

export function trackMetaDocumentDownload(event: MetaDocumentDownloadEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(META_DOCUMENT_DOWNLOAD_EVENT, { detail: event }),
  );
}
