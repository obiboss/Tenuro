"use server";

import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { createDeveloperAccountWithOwnerProfile } from "@/server/repositories/developer.repository";
import {
  getProfileById,
  upsertProfile,
} from "@/server/repositories/profiles.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  developerLoginSchema,
  registerDeveloperSchema,
} from "@/server/validators/developer-auth.schema";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function nullableText(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function registerDeveloperAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = registerDeveloperSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      password: formData.get("password"),
      companyName: formData.get("companyName"),
      companyEmail: formData.get("companyEmail"),
      rcNumber: formData.get("rcNumber"),
      officeAddress: formData.get("officeAddress"),
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      phone: normalizedPhone.e164,
      password: parsed.password,
      options: {
        data: {
          full_name: parsed.fullName,
          role: "developer",
        },
      },
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: error?.message ?? "Developer account could not be created.",
      };
    }

    const adminSupabase = createSupabaseAdminClient();

    await upsertProfile(adminSupabase, {
      id: data.user.id,
      role: "developer",
      fullName: parsed.fullName,
      phoneNumber: normalizedPhone.e164,
      email: data.user.email?.trim() ? data.user.email.trim() : null,
    });

    await createDeveloperAccountWithOwnerProfile(adminSupabase, {
      ownerProfileId: data.user.id,
      fullName: parsed.fullName,
      phoneNumber: normalizedPhone.e164,
      email: data.user.email?.trim() ? data.user.email.trim() : null,
      companyName: parsed.companyName,
      companyPhone: normalizedPhone.e164,
      companyEmail: nullableText(parsed.companyEmail),
      rcNumber: nullableText(parsed.rcNumber),
      officeAddress: nullableText(parsed.officeAddress),
    });

    shouldRedirect = true;
  } catch (error) {
    console.error("registerDeveloperAction failed:", error);
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/developer");
  }

  return {
    ok: true,
    message: "Developer account created successfully.",
  };
}

export async function developerLoginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = developerLoginSchema.parse({
      phoneNumber: formData.get("phoneNumber"),
      password: formData.get("password"),
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone.e164,
      password: parsed.password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: "That phone number or password is incorrect.",
      };
    }

    const adminSupabase = createSupabaseAdminClient();
    const profile = await getProfileById(adminSupabase, data.user.id);

    if (!profile || profile.role !== "developer") {
      await supabase.auth.signOut();

      return {
        ok: false,
        message:
          "This login is only for developer accounts. Please use the correct login page.",
      };
    }

    shouldRedirect = true;
  } catch (error) {
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/developer");
  }

  return {
    ok: true,
    message: "Signed in successfully.",
  };
}

export async function developerSignOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/developer/login");
}
