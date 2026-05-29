// export const GATED_LANDLORD_PATH_PREFIXES = [
//   "/properties",
//   "/tenants",
//   "/payments",
//   "/renewals",
//   "/activity",
//   "/public-receipts",
//   "/public-agreements",
//   "/caretakers",
//   "/reports",
// ] as const;

// export function isGatedLandlordPath(pathname: string) {
//   return GATED_LANDLORD_PATH_PREFIXES.some(
//     (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
//   );
// }

export const GATED_LANDLORD_PATH_PREFIXES = [] as const;

export function isGatedLandlordPath(pathname: string) {
  return GATED_LANDLORD_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
