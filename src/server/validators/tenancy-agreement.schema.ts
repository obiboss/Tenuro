import { z } from "zod";
import { uuidSchema } from "@/server/validators/common.schema";

export const generateTenancyAgreementSchema = z.object({
  tenancyId: uuidSchema,
});

export const saveTenancyAgreementDraftSchema = z.object({
  agreementId: uuidSchema,
  agreementBody: z
    .string()
    .trim()
    .min(100, "Agreement content is too short.")
    .max(50000, "Agreement content is too long."),
});

export type GenerateTenancyAgreementInput = z.infer<
  typeof generateTenancyAgreementSchema
>;

export type SaveTenancyAgreementDraftInput = z.infer<
  typeof saveTenancyAgreementDraftSchema
>;
