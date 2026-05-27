"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PropertyApplicationDecisionActionState } from "@/actions/property-applications.state";
import { errorResult } from "@/server/errors/result";
import {
  acceptPropertyApplicationForCurrentLandlord,
  rejectPropertyApplicationForCurrentLandlord,
  waitlistPropertyApplicationForCurrentLandlord,
} from "@/server/services/property-application-review.service";

const decisionSchema = z.object({
  applicationId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

function parseDecisionForm(formData: FormData) {
  return decisionSchema.parse({
    applicationId: formData.get("applicationId"),
    reason: formData.get("reason") || undefined,
  });
}

export async function acceptPropertyApplicationAction(
  _previousState: PropertyApplicationDecisionActionState,
  formData: FormData,
): Promise<PropertyApplicationDecisionActionState> {
  try {
    const parsed = parseDecisionForm(formData);

    await acceptPropertyApplicationForCurrentLandlord(parsed.applicationId);

    revalidatePath("/applications");
    revalidatePath("/tenants");
    revalidatePath("/overview");

    return {
      ok: true,
      message:
        "Application accepted. The tenant has been added to your tenant pipeline.",
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

export async function rejectPropertyApplicationAction(
  _previousState: PropertyApplicationDecisionActionState,
  formData: FormData,
): Promise<PropertyApplicationDecisionActionState> {
  try {
    const parsed = parseDecisionForm(formData);

    await rejectPropertyApplicationForCurrentLandlord({
      applicationId: parsed.applicationId,
      reason: parsed.reason ?? "Rejected by landlord.",
    });

    revalidatePath("/applications");

    return {
      ok: true,
      message: "Application rejected.",
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

export async function waitlistPropertyApplicationAction(
  _previousState: PropertyApplicationDecisionActionState,
  formData: FormData,
): Promise<PropertyApplicationDecisionActionState> {
  try {
    const parsed = parseDecisionForm(formData);

    await waitlistPropertyApplicationForCurrentLandlord({
      applicationId: parsed.applicationId,
      reason: parsed.reason ?? "Waitlisted by landlord.",
    });

    revalidatePath("/applications");

    return {
      ok: true,
      message: "Application waitlisted.",
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
