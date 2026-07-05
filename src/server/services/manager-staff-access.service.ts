import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createManagerStaffInvite,
  createManagerStaffMember,
  getActiveManagerStaffMemberByProfileAndOrganization,
  getManagerStaffInviteByToken,
  listManagerStaffInvites,
  listManagerStaffMembers,
  type ManagerStaffRole,
  type ManagerWorkspaceRole,
} from "@/server/repositories/manager-staff.repository";
import {
  getManagerOrganizationAccessForCurrentUser,
  type ManagerOrganizationAccess,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { CreateManagerStaffInviteInput } from "@/server/validators/manager-staff.schema";

export type ManagerWorkspacePermission =
  | "overview.view"
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

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return configuredUrl.replace(/\/$/, "");
}

function createInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

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

export async function getCurrentManagerOrganizationAccess(): Promise<{
  manager: Awaited<ReturnType<typeof requireManager>>;
  access: ManagerOrganizationAccess | null;
}> {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const access = await getManagerOrganizationAccessForCurrentUser(
    supabase,
    manager.id,
  );

  return {
    manager,
    access,
  };
}

export async function requireManagerWorkspacePermission(
  permission: ManagerWorkspacePermission,
) {
  const { manager, access } = await getCurrentManagerOrganizationAccess();

  if (!access) {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create or join a manager company before continuing.",
      403,
    );
  }

  if (!managerRoleHasPermission(access.staffRole, permission)) {
    throw new AppError(
      "MANAGER_PERMISSION_DENIED",
      "You do not have permission to perform this action.",
      403,
    );
  }

  return {
    manager,
    access,
  };
}

export async function createManagerStaffInvite(
  input: CreateManagerStaffInviteInput,
) {
  const { manager, access } =
    await requireManagerWorkspacePermission("staff.manage");
  const supabase = await createSupabaseServerClient();

  const token = createInviteToken();
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString();

  return createManagerStaffInvite(supabase, {
    organizationId: access.organization.id,
    staffName: input.staffName,
    staffEmail: input.staffEmail.toLowerCase(),
    staffRole: input.staffRole,
    token,
    note: nullableText(input.note),
    invitedByProfileId: manager.id,
    expiresAt,
  });
}

export async function getManagerStaffPageData() {
  const { access } = await requireManagerWorkspacePermission("staff.manage");
  const supabase = await createSupabaseServerClient();

  const [members, invites] = await Promise.all([
    listManagerStaffMembers(supabase, access.organization.id),
    listManagerStaffInvites(supabase, access.organization.id),
  ]);

  return {
    organization: access.organization,
    members,
    invites,
    inviteBaseUrl: `${getAppBaseUrl()}/manager-invite`,
  };
}

export async function getManagerStaffInvitePreview(token: string) {
  const supabase = createSupabaseAdminClient();
  const invite = await getManagerStaffInviteByToken(supabase, token);

  if (!invite) {
    return null;
  }

  return invite;
}

export async function acceptManagerStaffInvite(token: string) {
  const manager = await requireManager();
  const adminSupabase = createSupabaseAdminClient();

  const invite = await getManagerStaffInviteByToken(adminSupabase, token);

  if (!invite) {
    throw new AppError(
      "MANAGER_STAFF_INVITE_NOT_FOUND",
      "This staff invite could not be found.",
      404,
    );
  }

  if (invite.revoked_at) {
    throw new AppError(
      "MANAGER_STAFF_INVITE_REVOKED",
      "This staff invite is no longer available.",
      400,
    );
  }

  if (invite.accepted_at) {
    throw new AppError(
      "MANAGER_STAFF_INVITE_USED",
      "This staff invite has already been accepted.",
      400,
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new AppError(
      "MANAGER_STAFF_INVITE_EXPIRED",
      "This staff invite has expired.",
      400,
    );
  }

  if (
    !manager.email ||
    manager.email.toLowerCase() !== invite.staff_email.toLowerCase()
  ) {
    throw new AppError(
      "MANAGER_STAFF_INVITE_EMAIL_MISMATCH",
      "Please sign in with the email address that received this invite.",
      403,
    );
  }

  const existingMember =
    await getActiveManagerStaffMemberByProfileAndOrganization(adminSupabase, {
      organizationId: invite.organization_id,
      profileId: manager.id,
    });

  if (existingMember) {
    await markManagerStaffInviteAccepted(adminSupabase, {
      inviteId: invite.id,
      acceptedByProfileId: manager.id,
    });

    return existingMember;
  }

  const member = await createManagerStaffMember(adminSupabase, {
    organizationId: invite.organization_id,
    profileId: manager.id,
    staffName: invite.staff_name,
    staffEmail: invite.staff_email,
    staffRole: invite.staff_role as ManagerStaffRole,
    invitedByProfileId: invite.invited_by_profile_id,
    acceptedInviteId: invite.id,
  });

  await markManagerStaffInviteAccepted(adminSupabase, {
    inviteId: invite.id,
    acceptedByProfileId: manager.id,
  });

  return member;
}
