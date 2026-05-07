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
    type: "number" | "text";
  };
};

const GUIDED_RULE_PRESETS: Record<PropertyRuleCode, GuidedRulePreset> = {
  pets_not_allowed: {
    ruleCode: "pets_not_allowed",
    title: "No pets allowed",
    description: "This property does not permit tenants to keep pets.",
    category: "pets",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  maximum_occupants: {
    ruleCode: "maximum_occupants",
    title: "Maximum occupants",
    description: "This unit has a maximum number of allowed occupants.",
    category: "occupancy",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
    configField: {
      key: "maximumOccupants",
      type: "number",
    },
  },
  residential_only: {
    ruleCode: "residential_only",
    title: "Residential use only",
    description: "This property is for residential living only.",
    category: "business_use",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  commercial_permitted: {
    ruleCode: "commercial_permitted",
    title: "Commercial use permitted",
    description: "This property may be used for approved commercial purposes.",
    category: "business_use",
    enforcement: "information_only",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  children_under_5_not_allowed: {
    ruleCode: "children_under_5_not_allowed",
    title: "No children under 5",
    description:
      "This property does not permit children under age 5 to live in the unit.",
    category: "occupancy",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  minimum_monthly_income: {
    ruleCode: "minimum_monthly_income",
    title: "Minimum monthly income",
    description:
      "Tenant should meet the minimum monthly income requirement or be reviewed by the landlord.",
    category: "payment",
    enforcement: "landlord_review",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: false,
    configField: {
      key: "minimumMonthlyIncome",
      type: "number",
    },
  },
  guarantor_required: {
    ruleCode: "guarantor_required",
    title: "Guarantor required",
    description: "Tenant must be able to provide a guarantor if approved.",
    category: "documentation",
    enforcement: "landlord_review",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: false,
  },
  shortlet_not_allowed: {
    ruleCode: "shortlet_not_allowed",
    title: "No short-let or Airbnb",
    description:
      "This property cannot be used for short-let, Airbnb, daily rental, or similar use.",
    category: "business_use",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  subletting_not_allowed: {
    ruleCode: "subletting_not_allowed",
    title: "No subletting",
    description: "Tenant cannot sublet the unit or any part of it.",
    category: "occupancy",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  customer_facing_business_not_allowed: {
    ruleCode: "customer_facing_business_not_allowed",
    title: "No customer-facing business",
    description:
      "Businesses that bring regular customers, staff, or visitors to the property are not allowed.",
    category: "business_use",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  heavy_generator_or_equipment_not_allowed: {
    ruleCode: "heavy_generator_or_equipment_not_allowed",
    title: "No heavy generator or equipment",
    description:
      "Heavy generators, machinery, or commercial equipment are not permitted.",
    category: "safety",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  large_gatherings_not_allowed: {
    ruleCode: "large_gatherings_not_allowed",
    title: "No regular large gatherings",
    description:
      "Regular parties, events, meetings, or group gatherings are not permitted.",
    category: "noise",
    enforcement: "blocks_onboarding",
    appliesTo: "new_tenants",
    requiresTenantAcknowledgement: true,
  },
  smoking_not_allowed: {
    ruleCode: "smoking_not_allowed",
    title: "No smoking",
    description:
      "Smoking is not permitted inside the unit or restricted areas of the property.",
    category: "safety",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  parking_rules: {
    ruleCode: "parking_rules",
    title: "Parking rules",
    description: "Tenant must follow the property parking arrangement.",
    category: "other",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  waste_disposal_rules: {
    ruleCode: "waste_disposal_rules",
    title: "Waste disposal rules",
    description: "Tenant must follow the property waste disposal rules.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  quiet_hours: {
    ruleCode: "quiet_hours",
    title: "Quiet hours",
    description: "Tenant must avoid excessive noise during quiet hours.",
    category: "noise",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  visitor_rules: {
    ruleCode: "visitor_rules",
    title: "Visitors policy",
    description: "Tenant must follow the property visitor policy.",
    category: "occupancy",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  maintenance_reporting: {
    ruleCode: "maintenance_reporting",
    title: "Maintenance reporting",
    description:
      "Tenant should report maintenance issues through the approved process.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  no_structural_changes: {
    ruleCode: "no_structural_changes",
    title: "No structural changes",
    description:
      "Tenant must not make structural changes without landlord approval.",
    category: "maintenance",
    enforcement: "information_only",
    appliesTo: "all_tenants",
    requiresTenantAcknowledgement: true,
  },
  other_house_rule: {
    ruleCode: "other_house_rule",
    title: "Other house rule",
    description: "Additional property rule added by the landlord.",
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

function readRuleConfig(params: {
  formData: FormData;
  preset: GuidedRulePreset;
}) {
  if (!params.preset.configField) {
    return {};
  }

  const rawValue = readRequiredString(
    params.formData,
    params.preset.configField.key,
  );

  if (params.preset.configField.type === "number") {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      throw new Error("Enter a valid number for this rule.");
    }

    return {
      [params.preset.configField.key]: parsedValue,
    };
  }

  return {
    [params.preset.configField.key]: rawValue,
  };
}

export async function createPropertyRuleAction(
  _previousState: PropertyRuleActionState,
  formData: FormData,
): Promise<PropertyRuleActionState> {
  const propertyId = readRequiredString(formData, "propertyId");

  try {
    const ruleCode = readRequiredString(
      formData,
      "ruleCode",
    ) as PropertyRuleCode;
    const preset = GUIDED_RULE_PRESETS[ruleCode];

    if (!preset) {
      throw new Error("Selected property rule is not supported.");
    }

    const customTitle =
      ruleCode === "other_house_rule"
        ? readRequiredString(formData, "title")
        : preset.title;

    const customDescription =
      ruleCode === "other_house_rule"
        ? readRequiredString(formData, "description")
        : (readOptionalString(formData, "description") ?? preset.description);

    const parsed = createPropertyRuleSchema.parse({
      propertyId,
      unitId: readOptionalString(formData, "unitId"),
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
      sortOrder: readSortOrder(formData),
      config: readRuleConfig({
        formData,
        preset,
      }),
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
