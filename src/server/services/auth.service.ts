import "server-only";

import { redirect } from "next/navigation";
import {
  assertPermission,
  assertRole,
  type AppPermission,
} from "@/server/constants/permissions";
import { AppError } from "@/server/errors/app-error";
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

export async function requireUser(): Promise<ServerSessionUser> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();

    throw new AppError(
      "FORBIDDEN",
      "This Tenuro account is inactive. Please contact support.",
      403,
    );
  }

  return mapProfileToSessionUser(profile);
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
