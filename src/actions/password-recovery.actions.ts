"use server";

import { headers } from "next/headers";
import { getTrustedAuthOrigin } from "@/lib/auth/safe-auth-redirect";
import { errorResult } from "@/server/errors/result";
import { getProfileById } from "@/server/repositories/profiles.repository";
import {
  clearPhoneRecoveryCookies,
  getPhoneRecoveryPhoneNumber,
  getVerifiedPhoneRecoveryPhoneNumber,
  setPhoneRecoveryPhoneNumber,
  setVerifiedPhoneRecoveryPhoneNumber,
} from "@/server/services/password-recovery-state.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState, UserRole } from "@/server/types/auth.types";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  managerForgotPasswordSchema,
  passwordRecoveryUpdateSchema,
  phonePasswordRecoverySchema,
  recoveryOtpSchema,
} from "@/server/validators/password-recovery.schema";

type SupabaseAuthErrorLike = {
  message?: string;
  status?: number;
};

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const MANAGER_RESET_SENT_MESSAGE =
  "If an account exists for this email, password reset instructions have been sent.";

const PHONE_RESET_SENT_MESSAGE =
  "If this phone number is connected to an account, a verification code has been sent.";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function getAuthErrorText(error: SupabaseAuthErrorLike | null | undefined) {
  return error?.message?.toLowerCase() ?? "";
}

function isRateLimitError(error: SupabaseAuthErrorLike | null | undefined) {
  const message = getAuthErrorText(error);

  return error?.status === 429 || message.includes("rate limit");
}

function isAccountEnumerationSensitiveError(
  error: SupabaseAuthErrorLike | null | undefined,
) {
  const message = getAuthErrorText(error);

  return (
    message.includes("not found") ||
    message.includes("user not found") ||
    message.includes("signup") ||
    message.includes("not allowed")
  );
}

function isInvalidOtpError(error: SupabaseAuthErrorLike | null | undefined) {
  const message = getAuthErrorText(error);

  return (
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("token") ||
    message.includes("otp")
  );
}

async function getActionOrigin() {
  const headerList = await headers();

  return getTrustedAuthOrigin({
    configuredAppUrl:
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
    requestOrigin: headerList.get("origin"),
    requestHost: headerList.get("host"),
    forwardedProto: headerList.get("x-forwarded-proto"),
  });
}

async function signOutRecoverySession(supabase: ServerSupabaseClient) {
  await supabase.auth.signOut({ scope: "others" });
  await supabase.auth.signOut({ scope: "local" });
}

function getPhoneLoginPathForRole(role: UserRole) {
  if (role === "agent") {
    return "/agent/login";
  }

  if (role === "developer") {
    return "/developer/login";
  }

  return "/login";
}

export async function requestManagerPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = managerForgotPasswordSchema.parse({
      email: formData.get("email"),
    });

    const origin = await getActionOrigin();
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("next", "/manager/update-password");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
      redirectTo: callbackUrl.toString(),
    });

    if (isRateLimitError(error)) {
      return {
        ok: false,
        message: "Too many attempts. Please wait before trying again.",
      };
    }

    if (error && !isAccountEnumerationSensitiveError(error)) {
      return {
        ok: false,
        message:
          "Password reset instructions could not be sent. Please try again.",
      };
    }

    return {
      ok: true,
      message: MANAGER_RESET_SENT_MESSAGE,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestPhonePasswordRecoveryAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = phonePasswordRecoverySchema.parse({
      phoneNumber: formData.get("phoneNumber"),
    });

    const normalizedPhone = normalisePhoneNumber(parsed.phoneNumber);
    await clearPhoneRecoveryCookies();
    await setPhoneRecoveryPhoneNumber(normalizedPhone.e164);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone.e164,
      options: {
        shouldCreateUser: false,
      },
    });

    if (isRateLimitError(error)) {
      return {
        ok: false,
        message: "Too many attempts. Please wait before trying again.",
      };
    }

    if (error && !isAccountEnumerationSensitiveError(error)) {
      return {
        ok: false,
        message: "We could not send a verification code. Please try again.",
      };
    }

    return {
      ok: true,
      message: PHONE_RESET_SENT_MESSAGE,
      maskedPhoneNumber: normalizedPhone.e164,
      redirectTo: "/forgot-password/verify",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendPhoneRecoveryCodeAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    void previousState;
    void formData;

    const phoneNumber = await getPhoneRecoveryPhoneNumber();

    if (!phoneNumber) {
      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/forgot-password",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        shouldCreateUser: false,
      },
    });

    if (isRateLimitError(error)) {
      return {
        ok: false,
        message: "Too many attempts. Please wait before trying again.",
      };
    }

    if (error && !isAccountEnumerationSensitiveError(error)) {
      return {
        ok: false,
        message: "We could not send another code. Please try again.",
      };
    }

    return {
      ok: true,
      message: PHONE_RESET_SENT_MESSAGE,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyPhoneRecoveryOtpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const phoneNumber = await getPhoneRecoveryPhoneNumber();

    if (!phoneNumber) {
      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/forgot-password",
      };
    }

    const parsed = recoveryOtpSchema.parse({
      otpCode: formData.get("otpCode"),
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: parsed.otpCode,
      type: "sms",
    });

    if (isRateLimitError(error)) {
      return {
        ok: false,
        message: "Too many attempts. Please wait before trying again.",
      };
    }

    if (error || !data.user) {
      return {
        ok: false,
        message: isInvalidOtpError(error)
          ? "The verification code is invalid or has expired."
          : "We could not verify the code. Please try again.",
        fieldErrors: {
          otpCode: ["The verification code is invalid or has expired."],
        },
      };
    }

    const adminSupabase = createSupabaseAdminClient();
    const profile = await getProfileById(adminSupabase, data.user.id);

    if (
      !profile ||
      profile.role === "manager" ||
      profile.phone_number !== phoneNumber
    ) {
      await supabase.auth.signOut({ scope: "local" });

      return {
        ok: false,
        message: "The verification code is invalid or has expired.",
      };
    }

    await setVerifiedPhoneRecoveryPhoneNumber(phoneNumber);

    return {
      ok: true,
      message: "Code verified. You can now change your password.",
      redirectTo: "/reset-password",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateManagerRecoveredPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = passwordRecoveryUpdateSchema.parse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/manager/forgot-password",
      };
    }

    const adminSupabase = createSupabaseAdminClient();
    const profile = await getProfileById(adminSupabase, user.id);

    if (!profile || profile.role !== "manager") {
      await supabase.auth.signOut({ scope: "local" });

      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/manager/forgot-password",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.password,
    });

    if (error) {
      return {
        ok: false,
        message: "Password could not be changed. Please try again.",
      };
    }

    await signOutRecoverySession(supabase);

    return {
      ok: true,
      message: "Password changed successfully. Sign in with your new password.",
      redirectTo: "/manager/login?passwordUpdated=true",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePhoneRecoveredPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const verifiedPhoneNumber = await getVerifiedPhoneRecoveryPhoneNumber();

    if (!verifiedPhoneNumber) {
      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/forgot-password",
      };
    }

    const parsed = passwordRecoveryUpdateSchema.parse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/forgot-password",
      };
    }

    const adminSupabase = createSupabaseAdminClient();
    const profile = await getProfileById(adminSupabase, user.id);

    if (
      !profile ||
      profile.role === "manager" ||
      profile.phone_number !== verifiedPhoneNumber
    ) {
      await clearPhoneRecoveryCookies();
      await supabase.auth.signOut({ scope: "local" });

      return {
        ok: false,
        message: "Your recovery session is no longer valid. Start again.",
        redirectTo: "/forgot-password",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.password,
    });

    if (error) {
      return {
        ok: false,
        message: "Password could not be changed. Please try again.",
      };
    }

    const loginPath = getPhoneLoginPathForRole(profile.role);

    await clearPhoneRecoveryCookies();
    await signOutRecoverySession(supabase);

    return {
      ok: true,
      message: "Password changed successfully. Sign in with your new password.",
      redirectTo: `${loginPath}?passwordUpdated=true`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
