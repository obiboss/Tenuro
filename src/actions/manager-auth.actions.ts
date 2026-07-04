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

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
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
        message: error?.message ?? "Manager account could not be created.",
      };
    }

    createdUserId = data.user.id;

    const adminSupabase = createSupabaseAdminClient();

    await upsertProfile(adminSupabase, {
      id: data.user.id,
      role: "manager",
      fullName: parsed.fullName,
      phoneNumber: null,
      email: parsed.email,
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

export async function managerLoginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = managerLoginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
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
        message:
          "This login is only for BOPA Manager accounts. Please use the correct login page.",
      };
    }

    shouldRedirect = true;
  } catch (error) {
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/manager");
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
