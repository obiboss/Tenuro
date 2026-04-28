"use server";

import { errorResult } from "@/server/errors/result";
import { generateTenantOnboardingLink } from "@/server/services/onboarding.service";
import { generateOnboardingLinkSchema } from "@/server/validators/onboarding.schema";

export type OnboardingInviteActionState = {
  ok: boolean;
  message: string;
  onboardingUrl?: string;
  whatsappMessage?: string;
  expiresAt?: string;
  notificationId?: string;
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
      message:
        result.message === "Something went wrong. Please try again."
          ? error instanceof Error
            ? error.message
            : result.message
          : result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
