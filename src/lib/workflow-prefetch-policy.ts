const ONLINE_ONLY_ROUTE_PREFIXES = [
  "/reports",
  "/settings",
  "/agreements",
  "/public-agreements",
  "/public-receipts",
  "/payments/verify",
  "/app-fees/verify",
  "/subscription/callback",
  "/manager/reports",
  "/manager/payouts",
  "/manager/settings",
  "/manager/agreements",
  "/manager/subscription",
  "/developer/settings",
  "/developer/subscription",
  "/developer/documents",
  "/developer/payments",
  "/admin/payments",
  "/admin/payout-verifications",
  "/admin/payment-settings",
  "/pay",
  "/dev/pay",
] as const;

function matchesPrefix(
  pathname: string,
  prefix: string,
) {
  return (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`)
  );
}

export function isAggressiveWorkflowPrefetchAllowed(
  href: string,
) {
  const url = new URL(
    href,
    "https://bopa.local",
  );

  if (
    url.pathname === "/developer" &&
    url.searchParams.get("section") ===
      "settings"
  ) {
    return false;
  }

  return !ONLINE_ONLY_ROUTE_PREFIXES.some(
    (prefix) =>
      matchesPrefix(url.pathname, prefix),
  );
}
