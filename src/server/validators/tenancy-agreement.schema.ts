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

export const finalizeTenancyAgreementSchema = z.object({
  agreementId: uuidSchema,
});

export const generateAgreementAcceptanceLinkSchema = z.object({
  agreementId: uuidSchema,
});

export const acceptTenancyAgreementSchema = z.object({
  token: z.string().trim().min(32, "Invalid agreement link.").max(200),
});

export type GenerateTenancyAgreementInput = z.infer<
  typeof generateTenancyAgreementSchema
>;

export type SaveTenancyAgreementDraftInput = z.infer<
  typeof saveTenancyAgreementDraftSchema
>;

export type FinalizeTenancyAgreementInput = z.infer<
  typeof finalizeTenancyAgreementSchema
>;

export type GenerateAgreementAcceptanceLinkInput = z.infer<
  typeof generateAgreementAcceptanceLinkSchema
>;

export type AcceptTenancyAgreementInput = z.infer<
  typeof acceptTenancyAgreementSchema
>;
