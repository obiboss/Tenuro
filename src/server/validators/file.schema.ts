import { z } from "zod";

export const tenantKycDocumentTypeSchema = z.enum([
  "tenant_id_document",
  "tenant_passport_photo",
  "guarantor_id_document",
]);

export const tenantKycUploadSchema = z.object({
  token: z.string().trim().min(32, "Invalid onboarding token.").max(200),
  documentType: tenantKycDocumentTypeSchema,
});

export type TenantKycDocumentType = z.infer<typeof tenantKycDocumentTypeSchema>;
