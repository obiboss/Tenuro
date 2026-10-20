"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  META_DOCUMENT_DOWNLOAD_EVENT,
  type MetaDocumentDownloadEvent,
} from "@/lib/meta-pixel-events";

type PixelEvent = "PageView" | MetaDocumentDownloadEvent;

function pageType(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/receipt-generator") return "receipt-generator";
  if (pathname === "/agreement-generator" || pathname.startsWith("/agreement-generator/")) {
    return "agreement-generator";
  }
  return "other";
}

export function MetaPixelBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Compare search changes, but never forward their values to Meta.
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameReadyRef = useRef(false);
  const lastPageRef = useRef<string | null>(null);
  const pendingRef = useRef<PixelEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onFrameMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.source !== "bopa-meta-pixel" || event.data?.event !== "ready") return;
      if (frameReadyRef.current) return;
      frameReadyRef.current = true;
      setReady(true);
      for (const pending of pendingRef.current.splice(0)) {
        frameRef.current?.contentWindow?.postMessage(
          { source: "bopa-meta-pixel", event: pending, pageType: pageType(window.location.pathname) },
          "*",
        );
      }
    }
    window.addEventListener("message", onFrameMessage);
    frameRef.current?.contentWindow?.postMessage({ source: "bopa-meta-pixel", event: "ping" }, "*");
    return () => window.removeEventListener("message", onFrameMessage);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;
    if (lastPageRef.current === routeKey) return;
    lastPageRef.current = routeKey;
    frameRef.current?.contentWindow?.postMessage(
      { source: "bopa-meta-pixel", event: "PageView", pageType: pageType(pathname) },
      "*",
    );
  }, [pathname, ready, routeKey]);

  useEffect(() => {
    function onDownload(event: Event) {
      const name = (event as CustomEvent<MetaDocumentDownloadEvent>).detail;
      if (name !== "ReceiptDownload" && name !== "TenancyAgreementDownload") return;
      if (!ready) {
        pendingRef.current.push(name);
        return;
      }
      frameRef.current?.contentWindow?.postMessage(
        { source: "bopa-meta-pixel", event: name, pageType: pageType(window.location.pathname) },
        "*",
      );
    }
    window.addEventListener(META_DOCUMENT_DOWNLOAD_EVENT, onDownload);
    return () => window.removeEventListener(META_DOCUMENT_DOWNLOAD_EVENT, onDownload);
  }, [ready]);

  return (
    <iframe
      ref={frameRef}
      src="/meta-pixel-frame.html"
      title="BOPA analytics"
      aria-hidden="true"
      tabIndex={-1}
      referrerPolicy="no-referrer"
      sandbox="allow-scripts"
      className="pointer-events-none absolute size-0 border-0"
      onLoad={() => {
        frameRef.current?.contentWindow?.postMessage({ source: "bopa-meta-pixel", event: "ping" }, "*");
      }}
    />
  );
}
