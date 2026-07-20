import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createManagerStaffInvite as createManagerStaffInviteRecord,
  createManagerStaffMember,
  getActiveManagerStaffMemberByProfileAndOrganization,
  getManagerStaffInviteByToken,
  listManagerStaffInvites,
  listManagerStaffMembers,
  type ManagerStaffRole,
} from "@/server/repositories/manager-staff.repository";
import {
  getManagerOrganizationAccessForCurrentUser,
  type ManagerOrganizationAccess,
} from "@/server/repositories/manager.repository";
import {
  managerRoleHasPermission,
  type ManagerWorkspacePermission,
} from "@/lib/manager-staff-permission";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { ServerSessionUser } from "@/server/types/auth.types";
import type { CreateManagerStaffInviteInput } from "@/server/validators/manager-staff.schema";

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

async function requireManagerSession(): Promise<ServerSessionUser> {
  const { requireManager } = await import("@/server/services/auth.service");

  return requireManager();
}

export async function getCurrentManagerOrganizationAccess(): Promise<{
  manager: ServerSessionUser;
  access: ManagerOrganizationAccess | null;
}> {
  const manager = await requireManagerSession();
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

  const { assertBusinessSubscriptionAccessForProfile } =
    await import("@/server/services/business-subscription.service");

  await assertBusinessSubscriptionAccessForProfile({
    profileId: manager.id,
    workspaceType: "manager",
  });

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

  return createManagerStaffInviteRecord(supabase, {
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
  const manager = await requireManagerSession();
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

  const { assertBusinessSubscriptionAccessForWorkspace } = await import(
    "@/server/services/business-subscription.service"
  );

  await assertBusinessSubscriptionAccessForWorkspace({
    workspaceType: "manager",
    workspaceId: invite.organization_id,
  });

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
    const { markManagerStaffInviteAccepted } =
      await import("@/server/repositories/manager-staff.repository");

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

  const { markManagerStaffInviteAccepted } =
    await import("@/server/repositories/manager-staff.repository");

  await markManagerStaffInviteAccepted(adminSupabase, {
    inviteId: invite.id,
    acceptedByProfileId: manager.id,
  });

  return member;
}
