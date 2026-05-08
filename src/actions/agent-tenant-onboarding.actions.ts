"use server";

import { revalidatePath } from "next/cache";
import { type AgentTenantOnboardingActionState } from "@/actions/agent-tenant-onboarding.state";
import { errorResult } from "@/server/errors/result";
import { createTenantOnboardingLinkForCurrentAgent } from "@/server/services/agent-tenant-onboarding.service";
import { createAgentTenantOnboardingLinkSchema } from "@/server/validators/agent-tenant-onboarding.schema";

export async function createAgentTenantOnboardingLinkAction(
  _previousState: AgentTenantOnboardingActionState,
  formData: FormData,
): Promise<AgentTenantOnboardingActionState> {
  try {
    const parsed = createAgentTenantOnboardingLinkSchema.parse({
      listingId: formData.get("listingId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      note: formData.get("note"),
    });

    const result = await createTenantOnboardingLinkForCurrentAgent(parsed);

    revalidatePath("/agent/onboarding");
    revalidatePath("/agent/listings");

    return {
      ok: true,
      message: "Opening WhatsApp with the tenant onboarding message.",
      onboardingUrl: result.onboardingUrl,
      whatsappUrl: result.whatsappUrl,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
