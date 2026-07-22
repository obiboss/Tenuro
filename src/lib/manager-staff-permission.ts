import type { ManagerWorkspaceRole } from "@/server/repositories/manager-staff.repository";

export type ManagerWorkspacePermission =
  | "overview.view"
  | "records.import"
  | "property.manage"
  | "payment.manage"
  | "remittance.manage"
  | "reports.view"
  | "maintenance.manage"
  | "payout.manage"
  | "staff.manage";

export const MANAGER_STAFF_ROLE_LABELS: Record<ManagerWorkspaceRole, string> = {
  owner: "Owner",
  manager: "Manager",
  accountant: "Accountant",
  property_officer: "Property Officer",
  maintenance_officer: "Maintenance Officer",
};

const ROLE_PERMISSIONS: Record<
  ManagerWorkspaceRole,
  ManagerWorkspacePermission[]
> = {
  owner: [
    "overview.view",
    "records.import",
    "property.manage",
    "payment.manage",
    "remittance.manage",
    "reports.view",
    "maintenance.manage",
    "payout.manage",
    "staff.manage",
  ],
  manager: [
    "overview.view",
    "records.import",
    "property.manage",
    "payment.manage",
    "remittance.manage",
    "reports.view",
    "maintenance.manage",
  ],
  accountant: [
    "overview.view",
    "payment.manage",
    "remittance.manage",
    "reports.view",
  ],
  property_officer: ["overview.view", "property.manage"],
  maintenance_officer: ["overview.view", "maintenance.manage"],
};

export function managerRoleHasPermission(
  role: ManagerWorkspaceRole,
  permission: ManagerWorkspacePermission,
) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManagerRoleAccessPath(
  role: ManagerWorkspaceRole,
  pathname: string,
) {
  if (
    !pathname ||
    pathname === "/manager" ||
    pathname === "/manager/overview"
  ) {
    return true;
  }

  if (role === "owner") {
    return true;
  }

  if (pathname.startsWith("/manager/onboarding")) {
    return false;
  }

  if (pathname.startsWith("/manager/import")) {
    return managerRoleHasPermission(role, "records.import");
  }

  if (pathname.startsWith("/manager/staff")) {
    return managerRoleHasPermission(role, "staff.manage");
  }

  if (pathname.startsWith("/manager/payouts")) {
    return managerRoleHasPermission(role, "payout.manage");
  }

  if (
    pathname.startsWith("/manager/landlords") ||
    pathname.startsWith("/manager/properties") ||
    pathname.startsWith("/manager/tenants")
  ) {
    return managerRoleHasPermission(role, "property.manage");
  }

  if (pathname.startsWith("/manager/payments")) {
    return managerRoleHasPermission(role, "payment.manage");
  }

  if (pathname.startsWith("/manager/remittances")) {
    return managerRoleHasPermission(role, "remittance.manage");
  }

  if (pathname.startsWith("/manager/reports")) {
    return managerRoleHasPermission(role, "reports.view");
  }

  if (pathname.startsWith("/manager/maintenance")) {
    return managerRoleHasPermission(role, "maintenance.manage");
  }

  return true;
}
