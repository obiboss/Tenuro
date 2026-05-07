import { z } from "zod";
import { uuidSchema } from "@/server/validators/common.schema";

const optionalEmailSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.string().trim().email("Enter a valid email address.").optional(),
);

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

export const refreshTenancyAgreementAcceptanceLinkSchema = z.object({
  agreementId: uuidSchema,
});

export const acceptTenancyAgreementSchema = z.object({
  token: z.string().trim().min(32, "Invalid agreement link.").max(200),
});

export const generateTenancyAgreementPdfSchema = z.object({
  agreementId: uuidSchema,
});

export const submitAgreementGuarantorSchema = z.object({
  token: z.string().trim().min(32, "Invalid agreement link.").max(200),
  fullName: z.string().trim().min(2, "Enter guarantor name.").max(120),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter guarantor phone number.")
    .max(30),
  email: optionalEmailSchema,
  address: z.string().trim().min(5, "Enter guarantor address.").max(300),
  relationshipToTenant: z
    .string()
    .trim()
    .min(2, "Enter the relationship.")
    .max(80),
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

export type RefreshTenancyAgreementAcceptanceLinkInput = z.infer<
  typeof refreshTenancyAgreementAcceptanceLinkSchema
>;

export type AcceptTenancyAgreementInput = z.infer<
  typeof acceptTenancyAgreementSchema
>;

export type GenerateTenancyAgreementPdfInput = z.infer<
  typeof generateTenancyAgreementPdfSchema
>;

export type SubmitAgreementGuarantorInput = z.infer<
  typeof submitAgreementGuarantorSchema
>;
