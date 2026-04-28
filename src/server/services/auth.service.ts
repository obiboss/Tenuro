import "server-only";

import { redirect } from "next/navigation";
import { AppError } from "@/server/errors/app-error";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ProfileRow = {
  id: string;
  role: "landlord" | "tenant" | "caretaker";
  full_name: string;
  phone_number: string;
  email: string | null;
};

export async function requireUser() {
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
    .select("id, role, full_name, phone_number, email")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    phoneNumber: profile.phone_number,
    email: profile.email,
  };
}

export async function requireLandlord() {
  const user = await requireUser();

  if (user.role !== "landlord") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email,
  };
}

export async function requireTenant() {
  const user = await requireUser();

  if (user.role !== "tenant") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return user;
}

export async function requireCaretaker() {
  const user = await requireUser();

  if (user.role !== "caretaker") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return user;
}
