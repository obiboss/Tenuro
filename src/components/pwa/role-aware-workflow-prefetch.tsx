"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAggressiveWorkflowPrefetchAllowed } from "@/lib/workflow-prefetch-policy";

const PREFETCH_STAGGER_MS = 120;
const prefetchedRoutes = new Set<string>();

const LANDLORD_WORKSPACE_PREFIXES = [
  "/overview",
  "/properties",
  "/tenants",
  "/payments",
  "/renewals",
  "/activity",
  "/caretakers",
  "/agreements",
  "/reports",
  "/settings",
] as const;

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getWorkspaceNavigationLabels(pathname: string) {
  if (pathname.startsWith("/manager")) {
    return ["Manager navigation", "Mobile manager navigation"];
  }

  if (pathname.startsWith("/developer")) {
    return ["Developer navigation", "Mobile developer navigation"];
  }

  if (pathname.startsWith("/agent")) {
    return ["Agent navigation"];
  }

  if (pathname.startsWith("/caretaker")) {
    return ["Caretaker navigation"];
  }

  if (pathname.startsWith("/admin")) {
    return ["Platform admin navigation", "Mobile platform admin navigation"];
  }

  if (
    LANDLORD_WORKSPACE_PREFIXES.some((prefix) =>
      matchesRoutePrefix(pathname, prefix),
    )
  ) {
    return ["Landlord navigation", "Mobile landlord navigation"];
  }

  return [];
}

function getVisibleWorkflowRoutes(labels: string[]) {
  const selector = labels
    .map((label) => `nav[aria-label="${label}"] a[href]`)
    .join(",");

  if (!selector) {
    return [];
  }

  const routes = new Set<string>();

  for (const link of document.querySelectorAll<HTMLAnchorElement>(selector)) {
    const rawHref = link.getAttribute("href");

    if (!rawHref || rawHref.startsWith("#")) {
      continue;
    }

    const url = new URL(rawHref, window.location.href);

    if (
      url.origin !== window.location.origin ||
      !isAggressiveWorkflowPrefetchAllowed(`${url.pathname}${url.search}`)
    ) {
      continue;
    }

    routes.add(`${url.pathname}${url.search}`);
  }

  return [...routes];
}

export function RoleAwareWorkflowPrefetch() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }

    const navigationLabels = getWorkspaceNavigationLabels(pathname);

    if (navigationLabels.length === 0) {
      prefetchedRoutes.clear();
      return;
    }

    if (
      !isAggressiveWorkflowPrefetchAllowed(
        `${window.location.pathname}${window.location.search}`,
      )
    ) {
      return;
    }

    let cancelled = false;
    const routeTimers: number[] = [];

    const prefetch = () => {
      const currentRoute = `${window.location.pathname}${window.location.search}`;
      const routes = getVisibleWorkflowRoutes(navigationLabels).filter(
        (route) => route !== currentRoute && !prefetchedRoutes.has(route),
      );

      routes.forEach((route, index) => {
        const timerId = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          router.prefetch(route);
          prefetchedRoutes.add(route);
        }, index * PREFETCH_STAGGER_MS);

        routeTimers.push(timerId);
      });
    };

    const cancelScheduledRoutes = () => {
      cancelled = true;

      for (const timerId of routeTimers) {
        window.clearTimeout(timerId);
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

      return () => {
        idleWindow.cancelIdleCallback?.(idleId);
        cancelScheduledRoutes();
      };
    }

    const timerId = window.setTimeout(prefetch, 500);

    return () => {
      window.clearTimeout(timerId);
      cancelScheduledRoutes();
    };
  }, [pathname, router]);

  return null;
}
