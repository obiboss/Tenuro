import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaretakerAssignmentPermissions } from "@/server/constants/caretaker-permissions";

export type CaretakerInviteRow = {
  id: string;
  landlord_id: string;
  caretaker_name: string;
  caretaker_phone: string;
  property_ids: string[];
  permissions: CaretakerAssignmentPermissions;
  token: string;
  note: string | null;
  expires_at: string;
  accepted_by_profile_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

const CARETAKER_INVITE_SELECT = `
  id,
  landlord_id,
  caretaker_name,
  caretaker_phone,
  property_ids,
  permissions,
  token,
  note,
  expires_at,
  accepted_by_profile_id,
  accepted_at,
  revoked_at,
  created_at
`;

export async function createCaretakerInvite(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    caretakerName: string;
    caretakerPhone: string;
    propertyIds: string[];
    permissions: CaretakerAssignmentPermissions;
    tokenHash: string;
    note?: string | null;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_invites")
    .insert({
      landlord_id: params.landlordId,
      caretaker_name: params.caretakerName,
      caretaker_phone: params.caretakerPhone,
      property_ids: params.propertyIds,
      permissions: params.permissions,
      token: params.tokenHash,
      note: params.note ?? null,
      expires_at: params.expiresAt,
    })
    .select(CARETAKER_INVITE_SELECT)
    .single<CaretakerInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCaretakerInviteByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("caretaker_invites")
    .select(CARETAKER_INVITE_SELECT)
    .eq("token", tokenHash)
    .maybeSingle<CaretakerInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listPendingCaretakerInvitesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("caretaker_invites")
    .select(CARETAKER_INVITE_SELECT)
    .eq("landlord_id", landlordId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .returns<CaretakerInviteRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function markCaretakerInviteAccepted(
  supabase: SupabaseClient,
  params: {
    inviteId: string;
    acceptedByProfileId: string;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_invites")
    .update({
      accepted_by_profile_id: params.acceptedByProfileId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", params.inviteId)
    .is("accepted_at", null)
    .select(CARETAKER_INVITE_SELECT)
    .maybeSingle<CaretakerInviteRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function revokeCaretakerInvite(
  supabase: SupabaseClient,
  inviteId: string,
) {
  const { error } = await supabase
    .from("caretaker_invites")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }
}
