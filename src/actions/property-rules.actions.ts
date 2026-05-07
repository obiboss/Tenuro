"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  archivePropertyRuleForCurrentLandlord,
  createPropertyRuleForCurrentLandlord,
} from "@/server/services/property-rules.service";
import {
  createPropertyRuleSchema,
  type PropertyRuleCode,
} from "@/server/validators/property-rule.schema";
import type { PropertyRuleActionState } from "./property-rules.state";

type GuidedRulePreset = {
  ruleCode: PropertyRuleCode;
  title: string;
  description: string;
  category:
    | "occupancy"
    | "pets"
    | "payment"
    | "noise"
    | "business_use"
    | "maintenance"
    | "safety"
    | "documentation"
    | "other";
  enforcement: "information_only" | "landlord_review" | "blocks_onboarding";
  appliesTo: "all_tenants" | "new_tenants" | "renewing_tenants";
  requiresTenantAcknowledgement: boolean;
  configField?: {
    key: string;
    formKey: string;
    label: string;
  };
};

const GUIDED_RULE_PRESETS: Partial<Record<PropertyRuleCode, GuidedRulePreset>> =
  {
    pets_not_allowed: {
      ruleCode: "pets_not_allowed",
      title: "No pets",
      description: "Tenants with pets should not apply for this property.",
      category: "pets",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    maximum_occupants: {
      ruleCode: "maximum_occupants",
      title: "Maximum number of people allowed",
      description:
        "Only tenants within the allowed number of people should apply.",
      category: "occupancy",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
      configField: {
        key: "maximumOccupants",
        formKey: "maximumOccupants",
        label: "Maximum number of people allowed",
      },
    },
    residential_only: {
      ruleCode: "residential_only",
      title: "Residential use only",
      description:
        "Tenants who want to use the property for business should not apply.",
      category: "business_use",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    children_under_5_not_allowed: {
      ruleCode: "children_under_5_not_allowed",
      title: "No children under 5",
      description:
        "Tenants with children under 5 should not apply for this property.",
      category: "occupancy",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    minimum_monthly_income: {
      ruleCode: "minimum_monthly_income",
      title: "Can they keep paying the rent?",
      description:
        "Tenants below the required monthly income or regular cashflow should not apply.",
      category: "payment",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: false,
      configField: {
        key: "minimumMonthlyIncome",
        formKey: "minimumMonthlyIncome",
        label: "Lowest monthly income or cashflow allowed",
      },
    },
    guarantor_required: {
      ruleCode: "guarantor_required",
      title: "Guarantor needed",
      description:
        "Tenant will only be asked if they can provide a guarantor if approved.",
      category: "documentation",
      enforcement: "landlord_review",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: false,
    },
    shortlet_not_allowed: {
      ruleCode: "shortlet_not_allowed",
      title: "No short-let or Airbnb",
      description:
        "Tenants who want short-let, Airbnb, or daily rental should not apply.",
      category: "business_use",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    subletting_not_allowed: {
      ruleCode: "subletting_not_allowed",
      title: "No subletting",
      description:
        "Tenants who want to rent the property out to someone else should not apply.",
      category: "occupancy",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    customer_facing_business_not_allowed: {
      ruleCode: "customer_facing_business_not_allowed",
      title: "No business with many visitors",
      description:
        "Tenants whose business will bring customers, staff, or many visitors should not apply.",
      category: "business_use",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    heavy_generator_or_equipment_not_allowed: {
      ruleCode: "heavy_generator_or_equipment_not_allowed",
      title: "No heavy generator or equipment",
      description:
        "Tenants who want to use heavy generator, machines, or large equipment should not apply.",
      category: "safety",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
    large_gatherings_not_allowed: {
      ruleCode: "large_gatherings_not_allowed",
      title: "No regular parties or large gatherings",
      description:
        "Tenants who plan to hold regular parties, meetings, or large gatherings should not apply.",
      category: "noise",
      enforcement: "blocks_onboarding",
      appliesTo: "new_tenants",
      requiresTenantAcknowledgement: true,
    },
  };

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

function readSelectedRuleCodes(formData: FormData) {
  return formData
    .getAll("ruleCodes")
    .map((value) => String(value).trim())
    .filter(Boolean) as PropertyRuleCode[];
}

function readRuleConfig(params: {
  formData: FormData;
  preset: GuidedRulePreset;
}) {
  if (!params.preset.configField) {
    return {};
  }

  const rawValue = readRequiredString(
    params.formData,
    params.preset.configField.formKey,
  );

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `Enter a valid value for ${params.preset.configField.label}.`,
    );
  }

  return {
    [params.preset.configField.key]: parsedValue,
  };
}

export async function createPropertyRuleAction(
  _previousState: PropertyRuleActionState,
  formData: FormData,
): Promise<PropertyRuleActionState> {
  const propertyId = readRequiredString(formData, "propertyId");

  try {
    const selectedRuleCodes = readSelectedRuleCodes(formData);

    if (selectedRuleCodes.length === 0) {
      throw new Error("Choose at least one thing you do not want.");
    }

    const unitId = readOptionalString(formData, "unitId");
    let createdCount = 0;

    for (const ruleCode of selectedRuleCodes) {
      const preset = GUIDED_RULE_PRESETS[ruleCode];

      if (!preset) {
        throw new Error("One selected rule is not supported.");
      }

      const parsed = createPropertyRuleSchema.parse({
        propertyId,
        unitId,
        ruleCode: preset.ruleCode,
        title: preset.title,
        description: preset.description,
        category: preset.category,
        enforcement: preset.enforcement,
        appliesTo: preset.appliesTo,
        requiresTenantAcknowledgement: preset.requiresTenantAcknowledgement,
        sortOrder: readSortOrder(formData) + createdCount,
        config: readRuleConfig({
          formData,
          preset,
        }),
      });

      await createPropertyRuleForCurrentLandlord(parsed);
      createdCount += 1;
    }

    revalidatePath(`/properties/${propertyId}`);

    return successResult(
      createdCount === 1 ? "Rule saved." : `${createdCount} rules saved.`,
    );
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

    return successResult("Rule removed.");
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
