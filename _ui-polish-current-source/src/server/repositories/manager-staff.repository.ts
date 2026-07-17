import type { SupabaseClient } from "@supabase/supabase-js";

export type ManagerStaffRole =
  | "manager"
  | "accountant"
  | "property_officer"
  | "maintenance_officer";

export type ManagerWorkspaceRole = "owner" | ManagerStaffRole;

export type ManagerStaffMemberStatus = "active" | "suspended" | "revoked";

export type ManagerStaffMemberRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  staff_name: string;
  staff_email: string;
  staff_role: ManagerStaffRole;
  status: ManagerStaffMemberStatus;
  invited_by_profile_id: string | null;
  accepted_invite_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ManagerStaffInviteRow = {
  id: string;
  organization_id: string;
  staff_name: string;
  staff_email: string;
  staff_role: ManagerStaffRole;
  token: string;
  note: string | null;
  invited_by_profile_id: string;
  accepted_by_profile_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

const MANAGER_STAFF_MEMBER_SELECT = `
  id,
  organization_id,
  profile_id,
  staff_name,
  staff_email,
  staff_role,
  status,
  invited_by_profile_id,
  accepted_invite_id,
  created_at,
  updated_at
`;

const MANAGER_STAFF_INVITE_SELECT = `
  id,
  organization_id,
  staff_name,
  staff_email,
  staff_role,
  token,
  note,
  invited_by_profile_id,
  accepted_by_profile_id,
  accepted_at,
  revoked_at,
  expires_at,
  created_at,
  updated_at
`;

export async function getActiveManagerStaffMemberForProfile(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("manager_staff_members")
    .select(MANAGER_STAFF_MEMBER_SELECT)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ManagerStaffMemberRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerStaffMembers(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_staff_members")
    .select(MANAGER_STAFF_MEMBER_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .returns<ManagerStaffMemberRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerStaffInvites(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_staff_invites")
    .select(MANAGER_STAFF_INVITE_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .returns<ManagerStaffInviteRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerStaffInvite(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    staffName: string;
    staffEmail: string;
    staffRole: ManagerStaffRole;
    token: string;
    note: string | null;
    invitedByProfileId: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_staff_invites")
    .insert({
      organization_id: params.organizationId,
      staff_name: params.staffName,
      staff_email: params.staffEmail,
      staff_role: params.staffRole,
      token: params.token,
      note: params.note,
      invited_by_profile_id: params.invitedByProfileId,
      expires_at: params.expiresAt,
    })
    .select(MANAGER_STAFF_INVITE_SELECT)
    .single<ManagerStaffInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerStaffInviteByToken(
  supabase: SupabaseClient,
  token: string,
) {
  const { data, error } = await supabase
    .from("manager_staff_invites")
    .select(MANAGER_STAFF_INVITE_SELECT)
    .eq("token", token)
    .maybeSingle<ManagerStaffInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveManagerStaffMemberByProfileAndOrganization(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    profileId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_staff_members")
    .select(MANAGER_STAFF_MEMBER_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("profile_id", params.profileId)
    .eq("status", "active")
    .maybeSingle<ManagerStaffMemberRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerStaffMember(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    profileId: string;
    staffName: string;
    staffEmail: string;
    staffRole: ManagerStaffRole;
    invitedByProfileId: string;
    acceptedInviteId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_staff_members")
    .insert({
      organization_id: params.organizationId,
      profile_id: params.profileId,
      staff_name: params.staffName,
      staff_email: params.staffEmail,
      staff_role: params.staffRole,
      status: "active",
      invited_by_profile_id: params.invitedByProfileId,
      accepted_invite_id: params.acceptedInviteId,
    })
    .select(MANAGER_STAFF_MEMBER_SELECT)
    .single<ManagerStaffMemberRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markManagerStaffInviteAccepted(
  supabase: SupabaseClient,
  params: {
    inviteId: string;
    acceptedByProfileId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_staff_invites")
    .update({
      accepted_by_profile_id: params.acceptedByProfileId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", params.inviteId)
    .select(MANAGER_STAFF_INVITE_SELECT)
    .single<ManagerStaffInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}
