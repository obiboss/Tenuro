import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRole = "landlord" | "tenant" | "caretaker";

export type ProfileRow = {
  id: string;
  role: ProfileRole;
  full_name: string;
  phone_number: string | null;
  email: string | null;
};

const PROFILE_SELECT = "id, role, full_name, phone_number, email";

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
