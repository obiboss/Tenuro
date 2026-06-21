import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEVELOPER_STAFF_TITLE_PERMISSION_PRESETS,
  getDeveloperStaffTitleLabel,
  type DeveloperStaffTitle,
} from "@/constants/developer-staff-permissions";
import { AppError } from "@/server/errors/app-error";
import {
  createDeveloperStaffPermissions,
  createDeveloperStaffProfile,
  createDeveloperStaffRoleLink,
  getDeveloperStaffRoleLinkByHash,
  incrementDeveloperStaffRoleLinkAcceptedCount,
} from "@/server/repositories/developer-staff.repository";
import {
  getDeveloperAccountByOwnerProfileId,
  getDeveloperProfileByProfileId,
  type DeveloperProfileRole,
} from "@/server/repositories/developer.repository";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { AcceptDeveloperStaffRoleLinkInput } from "@/server/validators/developer-staff.schema";

const STAFF_ROLE_LINK_TTL_DAYS = 30;

function getAppUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!appUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "Application URL is not configured.",
      500,
    );
  }

  return appUrl.replace(/\/$/, "");
}

function createRawRoleLinkToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashDeveloperStaffRoleLinkToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRoleLinkExpiryDate() {
  return new Date(
    Date.now() + STAFF_ROLE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function getDeveloperProfileRoleForStaffTitle(
  title: DeveloperStaffTitle,
): DeveloperProfileRole {
  if (title === "accountant") {
    return "developer_accountant";
  }

  return "developer_staff";
}

function assertRoleLinkIsUsable(roleLink: {
  status: string;
  expires_at: string;
}) {
  if (roleLink.status !== "active") {
    throw new AppError(
      "DEVELOPER_STAFF_ROLE_LINK_NOT_ACTIVE",
      "This staff onboarding link is no longer active.",
      400,
    );
  }

  if (new Date(roleLink.expires_at).getTime() < Date.now()) {
    throw new AppError(
      "DEVELOPER_STAFF_ROLE_LINK_EXPIRED",
      "This staff onboarding link has expired.",
      410,
    );
  }
}

export async function createDeveloperStaffRoleLinkForTitle(params: {
  supabase: SupabaseClient;
  ownerProfileId: string;
  staffTitle: DeveloperStaffTitle;
}) {
  const account = await getDeveloperAccountByOwnerProfileId(
    params.supabase,
    params.ownerProfileId,
  );

  if (!account || account.status !== "active") {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_ACTIVE",
      "Developer account is not active.",
      403,
    );
  }

  const ownerDeveloperProfile = await getDeveloperProfileByProfileId(
    params.supabase,
    params.ownerProfileId,
  );

  if (
    !ownerDeveloperProfile ||
    ownerDeveloperProfile.developer_account_id !== account.id ||
    ownerDeveloperProfile.role !== "developer_owner"
  ) {
    throw new AppError(
      "DEVELOPER_STAFF_ROLE_LINK_FORBIDDEN",
      "Only the company owner can generate staff onboarding links at this stage.",
      403,
    );
  }

  const rawToken = createRawRoleLinkToken();
  const permissions = [
    ...DEVELOPER_STAFF_TITLE_PERMISSION_PRESETS[params.staffTitle],
  ];

  const roleLink = await createDeveloperStaffRoleLink(params.supabase, {
    developerAccountId: account.id,
    createdByProfileId: params.ownerProfileId,
    tokenHash: hashDeveloperStaffRoleLinkToken(rawToken),
    staffTitle: params.staffTitle,
    developerProfileRole: getDeveloperProfileRoleForStaffTitle(
      params.staffTitle,
    ),
    permissions,
    expiresAt: getRoleLinkExpiryDate(),
  });

  return {
    roleLink,
    onboardingUrl: `${getAppUrl()}/developer/staff/invite/${rawToken}`,
  };
}

export async function getPublicDeveloperStaffRoleLinkByToken(params: {
  supabase: SupabaseClient;
  token: string;
}) {
  const token = params.token.trim();

  if (!token) {
    return null;
  }

  const roleLink = await getDeveloperStaffRoleLinkByHash(
    params.supabase,
    hashDeveloperStaffRoleLinkToken(token),
  );

  if (!roleLink) {
    return null;
  }

  if (roleLink.status !== "active") {
    return null;
  }

  if (new Date(roleLink.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    id: roleLink.id,
    staffTitle: roleLink.staff_title,
    staffTitleLabel: getDeveloperStaffTitleLabel(roleLink.staff_title),
    expiresAt: roleLink.expires_at,
  };
}

export async function acceptDeveloperStaffRoleLink(params: {
  supabase: SupabaseClient;
  input: AcceptDeveloperStaffRoleLinkInput;
}) {
  const roleLink = await getDeveloperStaffRoleLinkByHash(
    params.supabase,
    hashDeveloperStaffRoleLinkToken(params.input.token),
  );

  if (!roleLink) {
    throw new AppError(
      "DEVELOPER_STAFF_ROLE_LINK_INVALID",
      "This staff onboarding link is invalid.",
      404,
    );
  }

  assertRoleLinkIsUsable(roleLink);

  const phone = normalisePhoneNumber(params.input.phoneNumber);
  const email =
    params.input.email.trim().length > 0 ? params.input.email.trim() : null;

  const { data: createdUser, error: createUserError } =
    await params.supabase.auth.admin.createUser({
      phone: phone.e164,
      password: params.input.password,
      phone_confirm: true,
      ...(email
        ? {
            email,
            email_confirm: true,
          }
        : {}),
      user_metadata: {
        full_name: params.input.fullName,
        role: "developer",
        developer_account_id: roleLink.developer_account_id,
        staff_title: roleLink.staff_title,
      },
    });

  if (createUserError || !createdUser.user) {
    throw new AppError(
      "DEVELOPER_STAFF_AUTH_CREATE_FAILED",
      createUserError?.message || "Staff login account could not be created.",
      400,
    );
  }

  const profileId = createdUser.user.id;

  try {
    const { error: profileError } = await params.supabase
      .from("profiles")
      .insert({
        id: profileId,
        role: "developer",
        full_name: params.input.fullName,
        phone_number: phone.e164,
        email,
        country_code: "NG",
        preferred_currency: "NGN",
        is_active: true,
      });

    if (profileError) {
      throw profileError;
    }

    const developerProfile = await createDeveloperStaffProfile(
      params.supabase,
      {
        developerAccountId: roleLink.developer_account_id,
        profileId,
        fullName: params.input.fullName,
        phoneNumber: phone.e164,
        email,
        role: roleLink.developer_profile_role,
        staffTitle: roleLink.staff_title,
        invitedByProfileId: roleLink.created_by_profile_id,
        managerDeveloperProfileId: null,
      },
    );

    await createDeveloperStaffPermissions(params.supabase, {
      developerAccountId: roleLink.developer_account_id,
      developerProfileId: developerProfile.id,
      grantedByProfileId: roleLink.created_by_profile_id,
      permissions: roleLink.permissions,
    });

    await incrementDeveloperStaffRoleLinkAcceptedCount(
      params.supabase,
      roleLink.id,
    );

    return {
      profileId,
      developerProfileId: developerProfile.id,
    };
  } catch (error) {
    await params.supabase.auth.admin.deleteUser(profileId);

    throw error;
  }
}
