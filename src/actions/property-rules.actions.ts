"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  archivePropertyRuleForCurrentLandlord,
  createPropertyRuleForCurrentLandlord,
} from "@/server/services/property-rules.service";
import { createPropertyRuleSchema } from "@/server/validators/property-rule.schema";
import type { PropertyRuleActionState } from "./property-rules.state";

function readRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value || null;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function readSortOrder(formData: FormData) {
  const rawValue = String(formData.get("sortOrder") ?? "0").trim();
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function getFriendlyErrorMessage(error: unknown, fallbackMessage: string) {
  if (fallbackMessage !== "Something went wrong. Please try again.") {
    return fallbackMessage;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export async function createPropertyRuleAction(
  _previousState: PropertyRuleActionState,
  formData: FormData,
): Promise<PropertyRuleActionState> {
  const propertyId = readRequiredString(formData, "propertyId");

  try {
    const parsed = createPropertyRuleSchema.parse({
      propertyId,
      unitId: readOptionalString(formData, "unitId"),
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category") || "other",
      enforcement: formData.get("enforcement") || "information_only",
      appliesTo: formData.get("appliesTo") || "new_tenants",
      requiresTenantAcknowledgement: readBoolean(
        formData,
        "requiresTenantAcknowledgement",
      ),
      sortOrder: readSortOrder(formData),
    });

    await createPropertyRuleForCurrentLandlord(parsed);

    revalidatePath(`/properties/${propertyId}`);

    return successResult("Property rule saved.");
  } catch (error) {
    console.error("createPropertyRuleAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: getFriendlyErrorMessage(error, result.message),
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function archivePropertyRuleAction(
  _previousState: PropertyRuleActionState,
  formData: FormData,
): Promise<PropertyRuleActionState> {
  const propertyId = readRequiredString(formData, "propertyId");

  try {
    await archivePropertyRuleForCurrentLandlord({
      propertyRuleId: readRequiredString(formData, "propertyRuleId"),
    });

    revalidatePath(`/properties/${propertyId}`);

    return successResult("Property rule archived.");
  } catch (error) {
    console.error("archivePropertyRuleAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: getFriendlyErrorMessage(error, result.message),
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
