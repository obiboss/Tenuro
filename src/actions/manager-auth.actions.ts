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
  completeSignupJourneyAfterVerifiedLoginSafely,
  createActivityJourneyKey,
  getActivityErrorDetails,
  recordActivityEventSafely,
  setActivityJourneySafely,
} from "@/server/services/activity.service";
import { getSessionUser } from "@/server/services/auth.service";
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

async function createManagerOrganizationForSignup(params: {
  ownerProfileId: string;
  organizationName: string;
  organizationEmail: string;
}) {
  const adminSupabase = createSupabaseAdminClient();

  const { error } = await adminSupabase.from("manager_organizations").insert({
    owner_profile_id: params.ownerProfileId,
    organization_name: params.organizationName,
    organization_email: params.organizationEmail,
    status: "active",
  });

  if (error) {
    throw error;
  }
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
  let journeyKey: string | null = null;
  let signupName: string | null = null;
  let signupEmail: string | null = null;

  try {
    const parsed = registerManagerSchema.parse({
      fullName: formData.get("fullName"),
      organizationName: formData.get("organizationName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const email = normalizeEmail(parsed.email);
    signupName = parsed.fullName;
    signupEmail = email;
    journeyKey = createActivityJourneyKey({
      journeyType: "signup",
      module: "manager",
    });
    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "manager",
      status: "in_progress",
      currentStep: "details_submitted",
      actorRole: "manager",
      contactName: parsed.fullName,
      contactValue: email,
      eventName: "manager.signup.started",
      eventCategory: "authentication",
      eventOutcome: "started",
      description: "Manager sign-up started.",
      metadata: {
        signup_role: "manager",
        organization_name: parsed.organizationName,
      },
    });
    const existingProfile = await getExistingProfileByEmail(email);

    if (existingProfile) {
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "manager",
        status: "failed",
        currentStep: "email_already_registered",
        actorProfileId: existingProfile.id,
        actorRole: existingProfile.role,
        contactName: parsed.fullName,
        contactValue: email,
        subjectType: "profiles",
        subjectId: existingProfile.id,
        lastErrorCode: "EMAIL_ALREADY_REGISTERED",
        lastErrorMessage: "This email is already connected to a BOPA account.",
        eventName: "manager.signup.failed",
        eventCategory: "authentication",
        description:
          "Manager sign-up stopped because the email is already registered.",
      });

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
          organization_name: parsed.organizationName,
          role: "manager",
        },
      },
    });

    if (error || !data.user) {
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "manager",
        status: "failed",
        currentStep: "auth_account_not_created",
        actorRole: "manager",
        contactName: parsed.fullName,
        contactValue: email,
        lastErrorCode: error?.code ?? "AUTH_SIGNUP_FAILED",
        lastErrorMessage:
          error?.message ?? "Manager account could not be created.",
        eventName: "manager.signup.failed",
        eventCategory: "authentication",
        description: "Manager sign-up failed before the account was created.",
      });

      return {
        ok: false,
        message: getSupabaseAuthErrorMessage(error?.message),
      };
    }

    createdUserId = data.user.id;

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "manager",
      status: "in_progress",
      currentStep: "auth_account_created",
      actorProfileId: data.user.id,
      actorRole: "manager",
      contactName: parsed.fullName,
      contactValue: email,
      subjectType: "profiles",
      subjectId: data.user.id,
      eventName: "manager.signup.auth_account_created",
      eventCategory: "authentication",
      description:
        "Manager authentication account created; workspace setup is continuing.",
    });

    const adminSupabase = createSupabaseAdminClient();

    await upsertProfile(adminSupabase, {
      id: data.user.id,
      role: "manager",
      fullName: parsed.fullName,
      phoneNumber: null,
      email,
    });

    await createManagerOrganizationForSignup({
      ownerProfileId: data.user.id,
      organizationName: parsed.organizationName,
      organizationEmail: email,
    });

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "manager",
      status: data.session ? "completed" : "in_progress",
      currentStep: data.session
        ? "workspace_ready"
        : "email_verification_pending",
      actorProfileId: data.user.id,
      actorRole: "manager",
      workspaceType: "manager",
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: parsed.fullName,
      contactValue: email,
      eventName: data.session
        ? "manager.signup.completed"
        : "manager.signup.email_verification_pending",
      eventCategory: "authentication",
      eventOutcome: data.session ? "succeeded" : "in_progress",
      description: data.session
        ? "Manager sign-up and workspace setup completed."
        : "Manager account and workspace were created; email verification is still required.",
      metadata: {
        organization_name: parsed.organizationName,
      },
    });

    if (data.session) {
      redirectTo = "/manager/overview";
    }

    if (!redirectTo) {
      return {
        ok: true,
        message:
          "Account created. Please check your email, verify your account, then sign in.",
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

    if (journeyKey) {
      const details = getActivityErrorDetails(error);
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "manager",
        status: "failed",
        currentStep: createdUserId ? "workspace_setup_failed" : "signup_failed",
        actorProfileId: createdUserId,
        actorRole: "manager",
        subjectType: createdUserId ? "profiles" : null,
        subjectId: createdUserId,
        contactName: signupName,
        contactValue: signupEmail,
        lastErrorCode: details.code,
        lastErrorMessage: details.message,
        eventName: "manager.signup.failed",
        eventCategory: "authentication",
        description: createdUserId
          ? "Manager authentication account was created, but workspace setup did not finish."
          : "Manager sign-up did not finish.",
        metadata: {
          cleanup_attempted: Boolean(createdUserId),
        },
      });
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
      await recordActivityEventSafely({
        module: "auth",
        eventName: "auth.login.failed",
        eventCategory: "authentication",
        outcome: "failed",
        actorRole: "manager",
        description: "Manager sign-in failed.",
        metadata: {
          login_area: "manager",
          email: normalizeEmail(parsed.email),
        },
      });

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

    await recordActivityEventSafely({
      module: "auth",
      eventName: "auth.login.succeeded",
      eventCategory: "authentication",
      outcome: "succeeded",
      actorProfileId: profile.id,
      actorRole: "manager",
      subjectType: "profiles",
      subjectId: profile.id,
      description: "Manager signed in.",
      metadata: {
        login_area: "manager",
      },
    });

    await completeSignupJourneyAfterVerifiedLoginSafely({
      profileId: profile.id,
      role: "manager",
      module: "manager",
    });

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

export const loginManagerAction = managerLoginAction;

export async function managerSignOutAction() {
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
      description: "Manager signed out.",
      metadata: {
        login_area: "manager",
      },
    });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/manager/login");
}
