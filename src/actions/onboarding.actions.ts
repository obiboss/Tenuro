"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  generateTenantOnboardingLink,
  submitTenantOnboardingProfile,
} from "@/server/services/onboarding.service";
import {
  generateOnboardingLinkSchema,
  tenantOnboardingSubmissionSchema,
} from "@/server/validators/onboarding.schema";

export type OnboardingInviteActionState = {
  ok: boolean;
  message: string;
  onboardingUrl?: string;
  whatsappMessage?: string;
  expiresAt?: string;
  notificationId?: string;
  fieldErrors?: Record<string, string[]>;
};

export type TenantOnboardingActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function generateTenantOnboardingLinkAction(
  _previousState: OnboardingInviteActionState,
  formData: FormData,
): Promise<OnboardingInviteActionState> {
  try {
    const parsed = generateOnboardingLinkSchema.parse({
      tenantId: formData.get("tenantId"),
    });

    const result = await generateTenantOnboardingLink(parsed.tenantId);

    return {
      ok: true,
      message: "Onboarding link prepared.",
      onboardingUrl: result.onboardingUrl,
      whatsappMessage: result.messageBody,
      expiresAt: result.expiresAt,
      notificationId: result.notificationId,
    };
  } catch (error) {
    console.error("generateTenantOnboardingLinkAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function submitTenantOnboardingAction(
  _previousState: TenantOnboardingActionState,
  formData: FormData,
): Promise<TenantOnboardingActionState> {
  try {
    const parsed = tenantOnboardingSubmissionSchema.parse({
      token: formData.get("token"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      dateOfBirth: formData.get("dateOfBirth"),
      homeAddress: formData.get("homeAddress"),
      occupation: formData.get("occupation"),
      employer: formData.get("employer"),
      idType: formData.get("idType"),
      idNumber: formData.get("idNumber"),
      guarantorFullName: formData.get("guarantorFullName"),
      guarantorPhoneNumber: formData.get("guarantorPhoneNumber"),
      guarantorEmail: formData.get("guarantorEmail"),
      guarantorAddress: formData.get("guarantorAddress"),
      guarantorRelationshipToTenant: formData.get(
        "guarantorRelationshipToTenant",
      ),
    });

    const result = await submitTenantOnboardingProfile(parsed);

    revalidatePath(`/tenants/${result.tenantId}`);

    return {
      ok: true,
      message:
        "Your tenant profile has been submitted. The landlord will review it and contact you with the next step.",
    };
  } catch (error) {
    console.error("submitTenantOnboardingAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
