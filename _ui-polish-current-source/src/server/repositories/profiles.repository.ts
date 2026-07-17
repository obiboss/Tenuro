import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/server/types/auth.types";

export type ProfileRole = UserRole;

export type ProfileRow = {
  id: string;
  role: ProfileRole;
  full_name: string;
  phone_number: string | null;
  email: string | null;
};

const PROFILE_SELECT = "id, role, full_name, phone_number, email";

export async function getProfilesByIds(
  supabase: SupabaseClient,
  profileIds: string[],
) {
  if (profileIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("id", profileIds)
    .returns<ProfileRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getProfileById(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", profileId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  params: {
    id: string;
    role: ProfileRole;
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
  },
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: params.id,
        role: params.role,
        full_name: params.fullName,
        phone_number: params.phoneNumber,
        email: params.email,
      },
      {
        onConflict: "id",
      },
    )
    .select(PROFILE_SELECT)
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}
