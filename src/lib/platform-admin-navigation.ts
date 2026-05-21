export type PlatformAdminDashboardPeriod = "day" | "week" | "month" | "year";

export function parsePlatformAdminDashboardPeriod(
  value: string | undefined,
): PlatformAdminDashboardPeriod {
  if (
    value === "day" ||
    value === "week" ||
    value === "month" ||
    value === "year"
  ) {
    return value;
  }

  return "week";
}

export function isPlatformAdminNavItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
