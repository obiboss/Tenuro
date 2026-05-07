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

export const createPropertyRuleSchema = z.object({
  propertyId: z.uuid(),
  unitId: z.uuid().nullable().optional(),
  title: z.string().trim().min(3, "Rule title is required."),
  description: z.string().trim().min(5, "Rule description is required."),
  category: propertyRuleCategorySchema.default("other"),
  enforcement: propertyRuleEnforcementSchema.default("information_only"),
  appliesTo: propertyRuleAppliesToSchema.default("new_tenants"),
  requiresTenantAcknowledgement: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
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
});

export const archivePropertyRuleSchema = z.object({
  propertyRuleId: z.uuid(),
});

export type CreatePropertyRuleInput = z.infer<typeof createPropertyRuleSchema>;
export type UpdatePropertyRuleInput = z.infer<typeof updatePropertyRuleSchema>;
export type ArchivePropertyRuleInput = z.infer<
  typeof archivePropertyRuleSchema
>;
