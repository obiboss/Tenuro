"use server";

import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import {
  getProfileById,
  upsertProfile,
} from "@/server/repositories/profiles.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import {
  managerLoginSchema,
  registerManagerSchema,
} from "@/server/validators/manager-auth.schema";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getExistingProfileByEmail(email: string) {
  const adminSupabase = createSupabaseAdminClient();

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, role, email")
    .eq("email", email)
    .maybeSingle<{
      id: string;
      role: string;
      email: string | null;
    }>();

  if (error) {
    throw error;
  }

  return data;
}

function getSupabaseAuthErrorMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("rate limit")) {
    return "Too many email attempts. Please wait before trying again.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return "An account already exists with this email. Please check your email or sign in.";
  }

  return message ?? "Manager account could not be created.";
}

export async function registerManagerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let redirectTo: string | null = null;
  let createdUserId: string | null = null;

  try {
    const parsed = registerManagerSchema.parse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const email = normalizeEmail(parsed.email);
    const existingProfile = await getExistingProfileByEmail(email);

    if (existingProfile) {
      return {
        ok: false,
        message:
          existingProfile.role === "manager"
            ? "A manager account already exists with this email. Please check your email or sign in."
            : "This email is already used for another BOPA account. Please sign in with the correct account or use another work email.",
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.password,
      options: {
        data: {
          full_name: parsed.fullName,
          role: "manager",
        },
      },
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: getSupabaseAuthErrorMessage(error?.message),
      };
    }

    createdUserId = data.user.id;

    const adminSupabase = createSupabaseAdminClient();

    await upsertProfile(adminSupabase, {
      id: data.user.id,
      role: "manager",
      fullName: parsed.fullName,
      phoneNumber: null,
      email,
    });

    if (data.session) {
      redirectTo = "/manager/onboarding";
    }

    if (!redirectTo) {
      return {
        ok: true,
        message:
          "Manager account created. Please check your email, verify your account, then sign in.",
      };
    }
  } catch (error) {
    if (createdUserId) {
      try {
        const adminSupabase = createSupabaseAdminClient();
        await adminSupabase.auth.admin.deleteUser(createdUserId);
      } catch {
        // Best-effort cleanup only.
      }
    }

    return toActionError(error);
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return {
    ok: true,
    message: "Manager account created successfully.",
  };
}

export async function loginManagerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = managerLoginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(parsed.email),
      password: parsed.password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: "That email or password is incorrect. Please try again.",
      };
    }

    const adminSupabase = createSupabaseAdminClient();
    const profile = await getProfileById(adminSupabase, data.user.id);

    if (!profile || profile.role !== "manager") {
      await supabase.auth.signOut();

      return {
        ok: false,
        message: "We could not find your BOPA Manager profile.",
      };
    }

    redirectTo = "/manager";
  } catch (error) {
    return toActionError(error);
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return {
    ok: true,
    message: "Signed in successfully.",
  };
}

export async function managerSignOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/manager/login");
}
