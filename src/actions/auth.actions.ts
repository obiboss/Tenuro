"use server";

import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import {
  getProfileById,
  upsertProfile,
  type ProfileRole,
} from "@/server/repositories/profiles.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  emailPasswordLoginSchema,
  emailPasswordRegisterSchema,
  magicLinkRequestSchema,
  phonePasswordLoginSchema,
  registerAgentSchema,
  registerLandlordSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "@/server/validators/auth.schema";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function getPostLoginRedirect(role: ProfileRole) {
  if (role === "platform_admin") {
    return "/admin";
  }

  if (role === "tenant") {
    return "/tenant";
  }

  if (role === "agent") {
    return "/agent/overview";
  }

  if (role === "caretaker") {
    return "/overview";
  }

  return "/overview";
}

async function ensureProfileForUser(params: {
  userId: string;
  role: ProfileRole;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  return upsertProfile(supabase, {
    id: params.userId,
    role: params.role,
    fullName: params.fullName,
    phoneNumber: params.phoneNumber,
    email: params.email?.trim() ? params.email.trim() : null,
  });
}

async function registerPhonePasswordUser(params: {
  role: Extract<ProfileRole, "landlord" | "agent">;
  fullName: string;
  phoneNumber: string;
  password: string;
}) {
  const normalizedPhone = normalisePhoneNumber(params.phoneNumber);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    phone: normalizedPhone.e164,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        role: params.role,
      },
    },
  });

  if (error || !data.user) {
    return {
      ok: false,
      message: error?.message ?? "Account could not be created.",
    } satisfies AuthActionState;
  }

  await ensureProfileForUser({
    userId: data.user.id,
    role: params.role,
    fullName: params.fullName,
    phoneNumber: normalizedPhone.e164,
    email: data.user.email?.trim() ? data.user.email.trim() : null,
  });

  return {
    ok: true,
    message: "Account created successfully.",
  } satisfies AuthActionState;
}

export async function phonePasswordLoginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = phonePasswordLoginSchema.parse({
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

    if (!profile) {
      await supabase.auth.signOut();

      return {
        ok: false,
        message: "We could not find your BOPA profile. Please contact support.",
      };
    }

    redirectTo = getPostLoginRedirect(profile.role);
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

export async function registerLandlordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = registerLandlordSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      password: formData.get("password"),
    });

    const result = await registerPhonePasswordUser({
      role: "landlord",
      fullName: parsed.fullName,
      phoneNumber: parsed.phoneNumber,
      password: parsed.password,
    });

    if (!result.ok) {
      return result;
    }

    shouldRedirect = true;
  } catch (error) {
    console.error("registerLandlordAction failed:", error);
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/overview");
  }

  return {
    ok: true,
    message: "Account created successfully.",
  };
}

export async function registerAgentAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = registerAgentSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      password: formData.get("password"),
    });

    const result = await registerPhonePasswordUser({
      role: "agent",
      fullName: parsed.fullName,
      phoneNumber: parsed.phoneNumber,
      password: parsed.password,
    });

    if (!result.ok) {
      return result;
    }

    shouldRedirect = true;
  } catch (error) {
    console.error("registerAgentAction failed:", error);
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/agent/overview");
  }

  return {
    ok: true,
    message: "Agent account created successfully.",
  };
}

export async function emailPasswordLoginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = emailPasswordLoginSchema.parse({
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

    if (!profile) {
      await supabase.auth.signOut();

      return {
        ok: false,
        message: "We could not find your BOPA profile. Please contact support.",
      };
    }

    redirectTo = getPostLoginRedirect(profile.role);
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

export async function emailPasswordRegisterAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = emailPasswordRegisterSchema.parse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: {
          full_name: parsed.fullName,
          role: "landlord",
        },
      },
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: error?.message ?? "Account could not be created.",
      };
    }

    await ensureProfileForUser({
      userId: data.user.id,
      role: "landlord",
      fullName: parsed.fullName,
      phoneNumber: null,
      email: parsed.email,
    });

    shouldRedirect = true;
  } catch (error) {
    return toActionError(error);
  }

  if (shouldRedirect) {
    redirect("/overview");
  }

  return {
    ok: true,
    message: "Account created successfully.",
  };
}

export async function requestMagicLinkAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = magicLinkRequestSchema.parse({
      email: formData.get("email"),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return {
        ok: false,
        message: "App URL is not configured.",
      };
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.email,
      options: {
        emailRedirectTo: `${appUrl.replace(/\/$/, "")}/auth/callback`,
      },
    });

    if (error) {
      return {
        ok: false,
        message: "Magic link could not be sent. Please try again.",
      };
    }

    return {
      ok: true,
      message: "Magic link sent. Please check your email.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Legacy OTP actions retained temporarily so old imports do not break.
 * Normal login/register no longer uses OTP.
 */
export async function requestOTPAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    requestOtpSchema.parse({
      phoneNumber: formData.get("phoneNumber"),
      purpose: formData.get("purpose") || "login",
    });

    return {
      ok: false,
      message:
        "OTP login is no longer used. Please sign in with phone number and password.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyOTPAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    verifyOtpSchema.parse({
      phoneNumber: formData.get("phoneNumber"),
      otpCode: formData.get("otpCode"),
      purpose: formData.get("purpose") || "login",
    });

    return {
      ok: false,
      message:
        "OTP login is no longer used. Please sign in with phone number and password.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}
