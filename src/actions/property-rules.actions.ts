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

const GUIDED_RULE_PRESETS: Record<PropertyRuleCode, GuidedRulePreset> = {
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
    title: "Limit number of people",
    description:
      "Only tenants within the allowed number of people should apply.",
    category: "occupancy",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
    configField: {
      key: "maximumOccupants",
      formKey: "maximumOccupants",
      label: "Maximum number of people",
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
  commercial_permitted: {
    ruleCode: "commercial_permitted",
    title: "Business use allowed",
    description: "The property can be used for approved business purposes.",
    category: "business_use",
    enforcement: "information_only",
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
    title: "Minimum monthly income",
    description:
      "Tenants below this income will be shown to you for review before approval.",
    category: "payment",
    enforcement: "landlord_review",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: false,
    configField: {
      key: "minimumMonthlyIncome",
      formKey: "minimumMonthlyIncome",
      label: "Minimum monthly income",
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
  smoking_not_allowed: {
    ruleCode: "smoking_not_allowed",
    title: "No smoking",
    description: "Smoking is not allowed inside the property.",
    category: "safety",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  parking_rules: {
    ruleCode: "parking_rules",
    title: "Parking rules",
    description:
      "Tenant must follow the parking arrangement for this property.",
    category: "other",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  waste_disposal_rules: {
    ruleCode: "waste_disposal_rules",
    title: "Waste disposal rules",
    description:
      "Tenant must follow the waste disposal rules for this property.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  quiet_hours: {
    ruleCode: "quiet_hours",
    title: "Quiet hours",
    description: "Tenant must avoid loud noise during quiet hours.",
    category: "noise",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  visitor_rules: {
    ruleCode: "visitor_rules",
    title: "Visitors rules",
    description: "Tenant must follow the visitor rules for this property.",
    category: "occupancy",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  maintenance_reporting: {
    ruleCode: "maintenance_reporting",
    title: "Report repairs properly",
    description: "Tenant must report repairs through the right process.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  no_structural_changes: {
    ruleCode: "no_structural_changes",
    title: "No changes to the building",
    description:
      "Tenant must not break, rebuild, or change the property without approval.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  other_house_rule: {
    ruleCode: "other_house_rule",
    title: "Other house rule",
    description: "Other house rule added by the landlord.",
    category: "other",
    enforcement: "information_only",
    appliesTo: "all_tenants",
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

      const customTitle =
        ruleCode === "other_house_rule"
          ? readRequiredString(formData, "otherRuleTitle")
          : preset.title;

      const customDescription =
        ruleCode === "other_house_rule"
          ? readRequiredString(formData, "otherRuleDescription")
          : preset.description;

      const parsed = createPropertyRuleSchema.parse({
        propertyId,
        unitId,
        ruleCode: preset.ruleCode,
        title: customTitle,
        description: customDescription,
        category: preset.category,
        enforcement: preset.enforcement,
        appliesTo: preset.appliesTo,
        requiresTenantAcknowledgement:
          ruleCode === "other_house_rule"
            ? readBoolean(formData, "requiresTenantAcknowledgement")
            : preset.requiresTenantAcknowledgement,
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
