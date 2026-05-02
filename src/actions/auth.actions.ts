"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errorResult } from "@/server/errors/result";
import {
  attachTenantProfile,
  getTenantShellByPhoneCandidates,
} from "@/server/repositories/tenant-dashboard.repository";
import {
  getProfileById,
  upsertProfile,
  type ProfileRole,
} from "@/server/repositories/profiles.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import {
  emailPasswordLoginSchema,
  emailPasswordRegisterSchema,
  magicLinkRequestSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "@/server/validators/auth.schema";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { AuthActionState } from "@/server/types/auth.types";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function getPostLoginRedirect(role: ProfileRole) {
  if (role === "tenant") {
    return "/tenant";
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

  await upsertProfile(supabase, {
    id: params.userId,
    role: params.role,
    fullName: params.fullName,
    phoneNumber: params.phoneNumber,
    email: params.email?.trim() ? params.email.trim() : null,
  });
}

async function getOrCreateTenantProfileForPhoneLogin(params: {
  userId: string;
  e164Phone: string;
  localPhone: string;
  email: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const existingProfile = await getProfileById(supabase, params.userId);

  if (existingProfile) {
    return existingProfile;
  }

  const phoneCandidates = [
    params.e164Phone,
    params.localPhone,
    params.e164Phone.replace("+", ""),
  ];

  const tenantShell = await getTenantShellByPhoneCandidates(
    supabase,
    phoneCandidates,
  );

  if (!tenantShell) {
    return null;
  }

  const profile = await upsertProfile(supabase, {
    id: params.userId,
    role: "tenant",
    fullName: tenantShell.full_name,
    phoneNumber: params.e164Phone,
    email: params.email?.trim() ? params.email.trim() : tenantShell.email,
  });

  await attachTenantProfile(supabase, {
    tenantId: tenantShell.id,
    profileId: params.userId,
  });

  return profile;
}

export async function requestOTPAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = requestOtpSchema.parse({
      phoneNumber: formData.get("phoneNumber"),
      purpose: formData.get("purpose") || "login",
      rememberDevice: true,
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone.e164,
      options: {
        channel: "sms",
      },
    });

    if (error) {
      console.error("Supabase OTP send failed:", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      return {
        ok: false,
        message:
          error.message ||
          "Verification code could not be sent. Please try again.",
      };
    }

    return {
      ok: true,
      message: `Verification code sent to ${normalizedPhone.local}.`,
      phoneNumber: normalizedPhone.e164,
      maskedPhoneNumber: normalizedPhone.local,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyOTPAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = verifyOtpSchema.parse({
      phoneNumber: formData.get("phoneNumber"),
      otpCode: formData.get("otpCode"),
      purpose: formData.get("purpose") || "login",
      rememberDevice: true,
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone.e164,
      token: parsed.otpCode,
      type: "sms",
    });

    if (error || !data.user) {
      console.error("Supabase login OTP verify failed:", {
        phone: normalizedPhone.e164,
        message: error?.message,
        status: error?.status,
        code: error?.code,
      });

      return {
        ok: false,
        message: "That code is incorrect or has expired. Please try again.",
      };
    }

    const profile = await getOrCreateTenantProfileForPhoneLogin({
      userId: data.user.id,
      e164Phone: normalizedPhone.e164,
      localPhone: normalizedPhone.local,
      email: data.user.email,
    });

    if (!profile) {
      await supabase.auth.signOut();

      return {
        ok: false,
        message:
          "We could not find a Tenuro account for this phone number. Please create an account first.",
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
    const schema = z.object({
      fullName: z.string().trim().min(2, "Enter your full name.").max(120),
      phoneNumber: z.string().trim().min(7, "Enter your phone number."),
      otpCode: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Enter the 6-digit code."),
    });

    const parsed = schema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      otpCode: formData.get("otpCode"),
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone.e164,
      token: parsed.otpCode,
      type: "sms",
    });

    if (error) {
      console.error("Supabase register OTP verify failed:", {
        phone: normalizedPhone.e164,
        message: error.message,
        status: error.status,
        code: error.code,
      });

      return {
        ok: false,
        message: error.message || "That code is incorrect or has expired.",
      };
    }

    if (!data.user) {
      return {
        ok: false,
        message:
          "The verification code was accepted, but no user was returned.",
      };
    }

    await ensureProfileForUser({
      userId: data.user.id,
      role: "landlord",
      fullName: parsed.fullName,
      phoneNumber: normalizedPhone.e164,
      email: data.user.email?.trim() ? data.user.email.trim() : null,
    });

    shouldRedirect = true;
  } catch (error) {
    console.error("registerLandlordAction unexpected error:", error);

    if (error instanceof Error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: "Registration failed. Please try again.",
    };
  }

  if (shouldRedirect) {
    redirect("/overview");
  }

  return {
    ok: true,
    message: "Account created successfully.",
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
        message:
          "We could not find your Tenuro profile. Please contact support.",
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

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}
