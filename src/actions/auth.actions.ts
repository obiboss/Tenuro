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
import { startLandlordTrialIfEligible } from "@/server/services/landlord-trial.service";
import {
  createActivityJourneyKey,
  getActivityErrorDetails,
  recordActivityEventSafely,
  setActivityJourneySafely,
} from "@/server/services/activity.service";
import { getSessionUser } from "@/server/services/auth.service";
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
    return "/caretaker/overview";
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
  const journeyKey = createActivityJourneyKey({
    journeyType: "signup",
    module: "auth",
  });

  await setActivityJourneySafely({
    journeyKey,
    journeyType: "signup",
    module: "auth",
    status: "in_progress",
    currentStep: "details_submitted",
    actorRole: params.role,
    contactName: params.fullName,
    contactValue: normalizedPhone.e164,
    eventName: "auth.signup.started",
    eventCategory: "authentication",
    eventOutcome: "started",
    description: `${params.role} sign-up started.`,
    metadata: {
      signup_role: params.role,
      signup_method: "phone_password",
    },
  });

  try {
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
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "auth",
        status: "failed",
        currentStep: "auth_account_not_created",
        actorRole: params.role,
        contactName: params.fullName,
        contactValue: normalizedPhone.e164,
        lastErrorCode: error?.code ?? "AUTH_SIGNUP_FAILED",
        lastErrorMessage: error?.message ?? "Account could not be created.",
        eventName: "auth.signup.failed",
        eventCategory: "authentication",
        description: `${params.role} sign-up failed before the account was created.`,
        metadata: {
          signup_role: params.role,
          signup_method: "phone_password",
        },
      });

      return {
        ok: false,
        message: error?.message ?? "Account could not be created.",
      } satisfies AuthActionState;
    }

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "auth",
      status: "in_progress",
      currentStep: "auth_account_created",
      actorProfileId: data.user.id,
      actorRole: params.role,
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: params.fullName,
      contactValue: normalizedPhone.e164,
      eventName: "auth.signup.auth_account_created",
      eventCategory: "authentication",
      description: `${params.role} authentication account created; profile setup is continuing.`,
      metadata: {
        signup_role: params.role,
        signup_method: "phone_password",
      },
    });

    await ensureProfileForUser({
      userId: data.user.id,
      role: params.role,
      fullName: params.fullName,
      phoneNumber: normalizedPhone.e164,
      email: data.user.email?.trim() ? data.user.email.trim() : null,
    });

    if (params.role === "landlord") {
      await startLandlordTrialIfEligible(data.user.id);
    }

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "auth",
      status: "completed",
      currentStep: "profile_ready",
      actorProfileId: data.user.id,
      actorRole: params.role,
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: params.fullName,
      contactValue: normalizedPhone.e164,
      eventName: "auth.signup.completed",
      eventCategory: "authentication",
      description: `${params.role} sign-up completed.`,
      metadata: {
        signup_role: params.role,
        signup_method: "phone_password",
      },
    });

    return {
      ok: true,
      message: "Account created successfully.",
    } satisfies AuthActionState;
  } catch (error) {
    const details = getActivityErrorDetails(error);

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "auth",
      status: "failed",
      currentStep: "profile_setup_failed",
      actorRole: params.role,
      contactName: params.fullName,
      contactValue: normalizedPhone.e164,
      lastErrorCode: details.code,
      lastErrorMessage: details.message,
      eventName: "auth.signup.failed",
      eventCategory: "authentication",
      description: `${params.role} authentication account was created, but BOPA profile setup did not finish.`,
      metadata: {
        signup_role: params.role,
        signup_method: "phone_password",
        incomplete_after: "auth_account_created",
      },
    });

    throw error;
  }
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
      await recordActivityEventSafely({
        module: "auth",
        eventName: "auth.login.failed",
        eventCategory: "authentication",
        outcome: "failed",
        actorRole: "unknown",
        description: "Phone and password sign-in failed.",
        metadata: {
          login_method: "phone_password",
          phone_number: normalizedPhone.e164,
        },
      });

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

    await recordActivityEventSafely({
      module: "auth",
      eventName: "auth.login.succeeded",
      eventCategory: "authentication",
      outcome: "succeeded",
      actorProfileId: profile.id,
      actorRole: profile.role,
      subjectType: "profiles",
      subjectId: profile.id,
      description: `${profile.role} signed in.`,
      metadata: {
        login_method: "phone_password",
      },
    });

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
      await recordActivityEventSafely({
        module: "auth",
        eventName: "auth.login.failed",
        eventCategory: "authentication",
        outcome: "failed",
        actorRole: "unknown",
        description: "Email and password sign-in failed.",
        metadata: {
          login_method: "email_password",
          email: parsed.email.toLowerCase(),
        },
      });

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

    await recordActivityEventSafely({
      module: "auth",
      eventName: "auth.login.succeeded",
      eventCategory: "authentication",
      outcome: "succeeded",
      actorProfileId: profile.id,
      actorRole: profile.role,
      subjectType: "profiles",
      subjectId: profile.id,
      description: `${profile.role} signed in.`,
      metadata: {
        login_method: "email_password",
      },
    });

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
  let journeyKey: string | null = null;

  try {
    const parsed = emailPasswordRegisterSchema.parse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    journeyKey = createActivityJourneyKey({
      journeyType: "signup",
      module: "auth",
    });
    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "auth",
      status: "in_progress",
      currentStep: "details_submitted",
      actorRole: "landlord",
      contactName: parsed.fullName,
      contactValue: parsed.email.toLowerCase(),
      eventName: "auth.signup.started",
      eventCategory: "authentication",
      eventOutcome: "started",
      description: "Landlord email sign-up started.",
      metadata: {
        signup_role: "landlord",
        signup_method: "email_password",
      },
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
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "auth",
        status: "failed",
        currentStep: "auth_account_not_created",
        actorRole: "landlord",
        contactName: parsed.fullName,
        contactValue: parsed.email.toLowerCase(),
        lastErrorCode: error?.code ?? "AUTH_SIGNUP_FAILED",
        lastErrorMessage: error?.message ?? "Account could not be created.",
        eventName: "auth.signup.failed",
        eventCategory: "authentication",
        description:
          "Landlord email sign-up failed before the account was created.",
      });

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

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "auth",
      status: "completed",
      currentStep: "profile_ready",
      actorProfileId: data.user.id,
      actorRole: "landlord",
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: parsed.fullName,
      contactValue: parsed.email.toLowerCase(),
      eventName: "auth.signup.completed",
      eventCategory: "authentication",
      description: "Landlord email sign-up completed.",
      metadata: {
        signup_role: "landlord",
        signup_method: "email_password",
      },
    });

    shouldRedirect = true;
  } catch (error) {
    if (journeyKey) {
      const details = getActivityErrorDetails(error);
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "auth",
        status: "failed",
        currentStep: "profile_setup_failed",
        actorRole: "landlord",
        lastErrorCode: details.code,
        lastErrorMessage: details.message,
        eventName: "auth.signup.failed",
        eventCategory: "authentication",
        description: "Landlord email sign-up did not finish.",
      });
    }

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
  const user = await getSessionUser();

  if (user) {
    await recordActivityEventSafely({
      module: "auth",
      eventName: "auth.logout.succeeded",
      eventCategory: "authentication",
      outcome: "succeeded",
      actorProfileId: user.id,
      actorRole: user.role,
      subjectType: "profiles",
      subjectId: user.id,
      description: `${user.role} signed out.`,
    });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}
