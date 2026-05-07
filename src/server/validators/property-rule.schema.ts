import { z } from "zod";

export const propertyRuleCategorySchema = z.enum([
  "occupancy",
  "pets",
  "payment",
  "noise",
  "business_use",
  "maintenance",
  "safety",
  "documentation",
  "other",
]);

export const propertyRuleEnforcementSchema = z.enum([
  "information_only",
  "landlord_review",
  "blocks_onboarding",
]);

export const propertyRuleAppliesToSchema = z.enum([
  "all_tenants",
  "new_tenants",
  "renewing_tenants",
]);

export const propertyRuleCodeSchema = z.enum([
  "pets_not_allowed",
  "maximum_occupants",
  "residential_only",
  "commercial_permitted",
  "children_under_5_not_allowed",
  "minimum_monthly_income",
  "guarantor_required",
  "shortlet_not_allowed",
  "subletting_not_allowed",
  "customer_facing_business_not_allowed",
  "heavy_generator_or_equipment_not_allowed",
  "large_gatherings_not_allowed",
  "smoking_not_allowed",
  "parking_rules",
  "waste_disposal_rules",
  "quiet_hours",
  "visitor_rules",
  "maintenance_reporting",
  "no_structural_changes",
  "other_house_rule",
]);

export const createPropertyRuleSchema = z.object({
  propertyId: z.uuid(),
  unitId: z.uuid().nullable().optional(),
  ruleCode: propertyRuleCodeSchema,
  title: z.string().trim().min(3, "Rule title is required."),
  description: z.string().trim().min(5, "Rule description is required."),
  category: propertyRuleCategorySchema.default("other"),
  enforcement: propertyRuleEnforcementSchema.default("information_only"),
  appliesTo: propertyRuleAppliesToSchema.default("new_tenants"),
  requiresTenantAcknowledgement: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const updatePropertyRuleSchema = z.object({
  unitId: z.uuid().nullable().optional(),
  title: z.string().trim().min(3, "Rule title is required.").optional(),
  description: z
    .string()
    .trim()
    .min(5, "Rule description is required.")
    .optional(),
  category: propertyRuleCategorySchema.optional(),
  enforcement: propertyRuleEnforcementSchema.optional(),
  appliesTo: propertyRuleAppliesToSchema.optional(),
  requiresTenantAcknowledgement: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const archivePropertyRuleSchema = z.object({
  propertyRuleId: z.uuid(),
});

export type PropertyRuleCode = z.infer<typeof propertyRuleCodeSchema>;
export type CreatePropertyRuleInput = z.infer<typeof createPropertyRuleSchema>;
export type UpdatePropertyRuleInput = z.infer<typeof updatePropertyRuleSchema>;
export type ArchivePropertyRuleInput = z.infer<
  typeof archivePropertyRuleSchema
>;
