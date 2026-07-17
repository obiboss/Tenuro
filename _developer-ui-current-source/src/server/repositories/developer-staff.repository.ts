import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeveloperStaffPermissionKey,
  DeveloperStaffTitle,
} from "@/constants/developer-staff-permissions";
import type { DeveloperProfileRole } from "@/server/repositories/developer.repository";

export type DeveloperStaffRoleLinkStatus = "active" | "revoked" | "expired";

export type DeveloperStaffRoleLinkRow = {
  id: string;
  developer_account_id: string;
  created_by_profile_id: string;
  token_hash: string;
  staff_title: DeveloperStaffTitle;
  developer_profile_role: DeveloperProfileRole;
  permissions: DeveloperStaffPermissionKey[];
  status: DeveloperStaffRoleLinkStatus;
  expires_at: string;
  accepted_count: number;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperStaffPermissionRow = {
  id: string;
  developer_account_id: string;
  developer_profile_id: string;
  permission_key: DeveloperStaffPermissionKey;
  granted_by_profile_id: string | null;
  created_at: string;
};

export type DeveloperStaffMemberRow = {
  id: string;
  developer_account_id: string;
  profile_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: DeveloperProfileRole;
  staff_title: DeveloperStaffTitle | null;
  is_active: boolean;
  invited_by_profile_id: string | null;
  manager_developer_profile_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  developer_staff_permissions: {
    permission_key: DeveloperStaffPermissionKey;
  }[];
};

const DEVELOPER_STAFF_ROLE_LINK_SELECT = `
  id,
  developer_account_id,
  created_by_profile_id,
  token_hash,
  staff_title,
  developer_profile_role,
  permissions,
  status,
  expires_at,
  accepted_count,
  revoked_at,
  created_at,
  updated_at
`;

const DEVELOPER_STAFF_MEMBER_SELECT = `
  id,
  developer_account_id,
  profile_id,
  full_name,
  phone_number,
  email,
  role,
  staff_title,
  is_active,
  invited_by_profile_id,
  manager_developer_profile_id,
  accepted_at,
  revoked_at,
  created_at,
  updated_at,
  developer_staff_permissions (
    permission_key
  )
`;

export async function createDeveloperStaffRoleLink(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    createdByProfileId: string;
    tokenHash: string;
    staffTitle: DeveloperStaffTitle;
    developerProfileRole: DeveloperProfileRole;
    permissions: DeveloperStaffPermissionKey[];
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_staff_role_links")
    .insert({
      developer_account_id: params.developerAccountId,
      created_by_profile_id: params.createdByProfileId,
      token_hash: params.tokenHash,
      staff_title: params.staffTitle,
      developer_profile_role: params.developerProfileRole,
      permissions: params.permissions,
      status: "active",
      expires_at: params.expiresAt,
    })
    .select(DEVELOPER_STAFF_ROLE_LINK_SELECT)
    .single<DeveloperStaffRoleLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listDeveloperStaffRoleLinks(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_staff_role_links")
    .select(DEVELOPER_STAFF_ROLE_LINK_SELECT)
    .eq("developer_account_id", developerAccountId)
    .order("created_at", { ascending: false })
    .returns<DeveloperStaffRoleLinkRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperStaffRoleLinkByHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("developer_staff_role_links")
    .select(DEVELOPER_STAFF_ROLE_LINK_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle<DeveloperStaffRoleLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperStaffProfile(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    profileId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    role: DeveloperProfileRole;
    staffTitle: DeveloperStaffTitle;
    invitedByProfileId: string;
    managerDeveloperProfileId: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_profiles")
    .insert({
      developer_account_id: params.developerAccountId,
      profile_id: params.profileId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      role: params.role,
      staff_title: params.staffTitle,
      invited_by_profile_id: params.invitedByProfileId,
      manager_developer_profile_id: params.managerDeveloperProfileId,
      accepted_at: new Date().toISOString(),
      is_active: true,
    })
    .select(
      `
        id,
        developer_account_id,
        profile_id,
        full_name,
        phone_number,
        email,
        role,
        staff_title,
        is_active,
        invited_by_profile_id,
        manager_developer_profile_id,
        accepted_at,
        revoked_at,
        created_at,
        updated_at
      `,
    )
    .single<Omit<DeveloperStaffMemberRow, "developer_staff_permissions">>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperStaffPermissions(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    developerProfileId: string;
    grantedByProfileId: string;
    permissions: DeveloperStaffPermissionKey[];
  },
) {
  if (params.permissions.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from("developer_staff_permissions")
    .insert(
      params.permissions.map((permission) => ({
        developer_account_id: params.developerAccountId,
        developer_profile_id: params.developerProfileId,
        permission_key: permission,
        granted_by_profile_id: params.grantedByProfileId,
      })),
    )
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    throw error;
  }

  return data.length;
}

export async function incrementDeveloperStaffRoleLinkAcceptedCount(
  supabase: SupabaseClient,
  roleLinkId: string,
) {
  const { error } = await supabase.rpc(
    "increment_developer_staff_role_link_accepted_count",
    {
      p_role_link_id: roleLinkId,
    },
  );

  if (error) {
    throw error;
  }
}

export async function listDeveloperStaffMembers(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_profiles")
    .select(DEVELOPER_STAFF_MEMBER_SELECT)
    .eq("developer_account_id", developerAccountId)
    .in("role", ["developer_staff", "developer_accountant"])
    .order("created_at", { ascending: false })
    .returns<DeveloperStaffMemberRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
