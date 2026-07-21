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
import {
  completeSignupJourneyAfterVerifiedLoginSafely,
  createActivityJourneyKey,
  getActivityErrorDetails,
  recordActivityEventSafely,
  setActivityJourneySafely,
} from "@/server/services/activity.service";
import { getSessionUser } from "@/server/services/auth.service";
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
  let createdUserId: string | null = null;
  let journeyKey: string | null = null;
  let signupName: string | null = null;
  let signupPhone: string | null = null;

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
    signupName = parsed.fullName;
    signupPhone = normalizedPhone.e164;
    journeyKey = createActivityJourneyKey({
      journeyType: "signup",
      module: "developer",
    });
    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "developer",
      status: "in_progress",
      currentStep: "details_submitted",
      actorRole: "developer",
      contactName: parsed.fullName,
      contactValue: normalizedPhone.e164,
      eventName: "developer.signup.started",
      eventCategory: "authentication",
      eventOutcome: "started",
      description: "Developer sign-up started.",
      metadata: {
        signup_role: "developer",
        company_name: parsed.companyName,
      },
    });
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
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "developer",
        status: "failed",
        currentStep: "auth_account_not_created",
        actorRole: "developer",
        contactName: parsed.fullName,
        contactValue: normalizedPhone.e164,
        lastErrorCode: error?.code ?? "AUTH_SIGNUP_FAILED",
        lastErrorMessage:
          error?.message ?? "Developer account could not be created.",
        eventName: "developer.signup.failed",
        eventCategory: "authentication",
        description: "Developer sign-up failed before the account was created.",
      });

      return {
        ok: false,
        message: error?.message ?? "Developer account could not be created.",
      };
    }

    createdUserId = data.user.id;

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "developer",
      status: "in_progress",
      currentStep: "auth_account_created",
      actorProfileId: data.user.id,
      actorRole: "developer",
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: parsed.fullName,
      contactValue: normalizedPhone.e164,
      eventName: "developer.signup.auth_account_created",
      eventCategory: "authentication",
      description:
        "Developer authentication account created; company workspace setup is continuing.",
    });

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

    await setActivityJourneySafely({
      journeyKey,
      journeyType: "signup",
      module: "developer",
      status: "completed",
      currentStep: "workspace_ready",
      actorProfileId: data.user.id,
      actorRole: "developer",
      workspaceType: "developer",
      subjectType: "profiles",
      subjectId: data.user.id,
      contactName: parsed.fullName,
      contactValue: normalizedPhone.e164,
      eventName: "developer.signup.completed",
      eventCategory: "authentication",
      description: "Developer sign-up and company workspace setup completed.",
      metadata: {
        company_name: parsed.companyName,
      },
    });

    shouldRedirect = true;
  } catch (error) {
    if (createdUserId) {
      try {
        await createSupabaseAdminClient().auth.admin.deleteUser(createdUserId);
      } catch {
        // Best-effort cleanup. The failed journey remains visible to Admin.
      }
    }

    if (journeyKey) {
      const details = getActivityErrorDetails(error);
      await setActivityJourneySafely({
        journeyKey,
        journeyType: "signup",
        module: "developer",
        status: "failed",
        currentStep: createdUserId ? "workspace_setup_failed" : "signup_failed",
        actorProfileId: createdUserId,
        actorRole: "developer",
        subjectType: createdUserId ? "profiles" : null,
        subjectId: createdUserId,
        contactName: signupName,
        contactValue: signupPhone,
        lastErrorCode: details.code,
        lastErrorMessage: details.message,
        eventName: "developer.signup.failed",
        eventCategory: "authentication",
        description: createdUserId
          ? "Developer authentication account was created, but company workspace setup did not finish."
          : "Developer sign-up did not finish.",
        metadata: {
          cleanup_attempted: Boolean(createdUserId),
        },
      });
    }

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
      await recordActivityEventSafely({
        module: "auth",
        eventName: "auth.login.failed",
        eventCategory: "authentication",
        outcome: "failed",
        actorRole: "developer",
        description: "Developer sign-in failed.",
        metadata: {
          login_area: "developer",
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

    if (!profile || profile.role !== "developer") {
      await supabase.auth.signOut();

      return {
        ok: false,
        message:
          "This login is only for developer accounts. Please use the correct login page.",
      };
    }

    await recordActivityEventSafely({
      module: "auth",
      eventName: "auth.login.succeeded",
      eventCategory: "authentication",
      outcome: "succeeded",
      actorProfileId: profile.id,
      actorRole: "developer",
      subjectType: "profiles",
      subjectId: profile.id,
      description: "Developer signed in.",
      metadata: {
        login_area: "developer",
      },
    });

    await completeSignupJourneyAfterVerifiedLoginSafely({
      profileId: profile.id,
      role: "developer",
      module: "developer",
    });

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
      description: "Developer signed out.",
      metadata: {
        login_area: "developer",
      },
    });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/developer/login");
}
