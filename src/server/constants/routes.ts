export const APP_ROUTES = {
  landlord: {
    tenants: "/tenants",
  },
  onboarding: {
    tenant: "/onboarding/tenant",
  },
} as const;

export function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL.");
  }

  return appUrl.replace(/\/$/, "");
}
