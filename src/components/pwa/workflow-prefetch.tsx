"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const MANAGER_WORKFLOW_ROUTES = [
  "/manager/overview",
  "/manager/properties",
  "/manager/tenants",
  "/manager/payments",
] as const;

const LANDLORD_WORKFLOW_ROUTES = [
  "/overview",
  "/properties",
  "/tenants",
  "/payments",
] as const;

function isLandlordWorkspacePath(pathname: string) {
  return [
    "/overview",
    "/properties",
    "/tenants",
    "/payments",
    "/agreements",
    "/renewals",
    "/reports",
    "/settings",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function WorkflowPrefetch() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }

    const routes = pathname.startsWith("/manager")
      ? MANAGER_WORKFLOW_ROUTES
      : isLandlordWorkspacePath(pathname)
        ? LANDLORD_WORKFLOW_ROUTES
        : [];

    if (routes.length === 0) {
      return;
    }

    const prefetch = () => {
      for (const route of routes) {
        if (route !== pathname) {
          router.prefetch(route);
        }
      }
    };

    const idleWindow = window as unknown as {
      requestIdleCallback?: (
        callback: () => void,
        options: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prefetch, {
        timeout: 2_000,
      });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timerId = globalThis.setTimeout(prefetch, 500);
    return () => globalThis.clearTimeout(timerId);
  }, [pathname, router]);

  return null;
}
