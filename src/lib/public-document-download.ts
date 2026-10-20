import {
  trackMetaDocumentDownload,
  type MetaDocumentDownloadEvent,
} from "@/lib/meta-pixel-events";

export async function downloadPublicDocumentPdf(params: {
  url: string;
  fallbackFilename: string;
  event: MetaDocumentDownloadEvent;
}) {
  const downloadUrl = new URL(params.url, window.location.origin);
  if (downloadUrl.origin !== window.location.origin) {
    window.location.assign(params.url);
    return;
  }

  try {
    const response = await fetch(downloadUrl, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/pdf")) {
      throw new Error("The PDF download was not successful.");
    }

    const bytes = await response.arrayBuffer();
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") {
      throw new Error("The download response was not a PDF.");
    }

    const filename = /filename="([^"]+)"/i.exec(response.headers.get("content-disposition") ?? "")?.[1]
      ?? params.fallbackFilename;
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    trackMetaDocumentDownload(params.event);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // Keep the existing direct-download route available if the browser cannot fetch the PDF.
    // A fallback navigation is not counted as a confirmed download event.
    window.location.assign(params.url);
  }
}
