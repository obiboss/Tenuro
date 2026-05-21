import { z } from "zod";

export const saveAgreementTemplateSchema = z.object({
  propertyId: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(3, "Enter a template name.")
    .max(120, "Template name is too long."),
  templateBody: z
    .string()
    .trim()
    .min(100, "Template content is too short.")
    .max(50000, "Template content is too long."),
});

export type SaveAgreementTemplateInput = z.infer<
  typeof saveAgreementTemplateSchema
>;
