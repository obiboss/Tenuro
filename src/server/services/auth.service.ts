import "server-only";

import { redirect } from "next/navigation";
import {
  assertPermission,
  assertRole,
  type AppPermission,
} from "@/server/constants/permissions";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { ServerSessionUser, UserRole } from "@/server/types/auth.types";

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

function mapProfileToSessionUser(profile: ProfileRow): ServerSessionUser {
  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    phoneNumber: profile.phone_number,
    email: profile.email,
  };
}

async function fetchSessionUserProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile || !profile.is_active) {
    return null;
  }

  return mapProfileToSessionUser(profile);
}

export async function getSessionUser(): Promise<ServerSessionUser | null> {
  return fetchSessionUserProfile();
}

export async function requireUser(): Promise<ServerSessionUser> {
  const user = await fetchSessionUserProfile();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(params: {
  allowedRoles: readonly UserRole[];
  message?: string;
}): Promise<ServerSessionUser> {
  const user = await requireUser();

  assertRole({
    role: user.role,
    allowedRoles: params.allowedRoles,
    message: params.message,
  });

  return user;
}

export async function requirePermission(
  permission: AppPermission,
): Promise<ServerSessionUser> {
  const user = await requireUser();

  assertPermission(user.role, permission);

  return user;
}

export async function requireLandlord() {
  return requireRole({
    allowedRoles: ["landlord"],
    message: "You do not have permission to view this landlord page.",
  });
}

export async function requireLandlordPlatformOperator() {
  const landlord = await requireLandlord();
  const { assertLandlordPlatformAccessForProfile } = await import(
    "@/server/services/landlord-subscription-access.service"
  );

  await assertLandlordPlatformAccessForProfile(landlord.id);

  return landlord;
}

export async function requireTenant() {
  return requireRole({
    allowedRoles: ["tenant"],
    message: "You do not have permission to view this tenant page.",
  });
}

export async function requireCaretaker() {
  return requireRole({
    allowedRoles: ["caretaker"],
    message: "You do not have permission to view this caretaker page.",
  });
}

export async function requireAgent() {
  return requireRole({
    allowedRoles: ["agent"],
    message: "You do not have permission to view this agent page.",
  });
}

export async function requireLandlordOrCaretaker() {
  return requireRole({
    allowedRoles: ["landlord", "caretaker"],
    message: "You do not have permission to access this landlord workspace.",
  });
}

export async function requireLandlordOrAgent() {
  return requireRole({
    allowedRoles: ["landlord", "agent"],
    message: "You do not have permission to access this workspace.",
  });
}
