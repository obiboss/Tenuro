import { z } from "zod";

export const tenantKycDocumentTypeSchema = z.enum([
  "tenant_id_document",
  "tenant_passport_photo",
  "guarantor_id_document",
]);

export const publicTenantKycDocumentTypeSchema = z.enum([
  "tenant_id_document",
  "tenant_passport_photo",
]);

export const managerCurrentOccupantEvidenceDocumentTypeSchema = z.enum([
  "existing_tenant_last_payment_receipt",
]);

const onboardingTenantKycUploadSchema = z
  .object({
    token: z.string().trim().min(32, "Invalid onboarding token.").max(200),
    documentType: tenantKycDocumentTypeSchema,
  })
  .transform((value) => ({
    uploadContext: "tenant_onboarding" as const,
    token: value.token,
    documentType: value.documentType,
  }));

const publicTenantListingKycUploadSchema = z
  .object({
    agentPropertyListingId: z.string().uuid("Invalid listing."),
    documentType: publicTenantKycDocumentTypeSchema,
  })
  .transform((value) => ({
    uploadContext: "public_listing_application" as const,
    agentPropertyListingId: value.agentPropertyListingId,
    documentType: value.documentType,
  }));

const managerCurrentOccupantEvidenceUploadSchema = z
  .object({
    managerOnboardingToken: z
      .string()
      .trim()
      .min(32, "Invalid tenant link.")
      .max(200),
    documentType: managerCurrentOccupantEvidenceDocumentTypeSchema,
  })
  .transform((value) => ({
    uploadContext: "manager_current_occupant_evidence" as const,
    managerOnboardingToken: value.managerOnboardingToken,
    documentType: value.documentType,
  }));

export const tenantKycUploadSchema = z.union([
  onboardingTenantKycUploadSchema,
  publicTenantListingKycUploadSchema,
  managerCurrentOccupantEvidenceUploadSchema,
]);

export type TenantKycDocumentType = z.infer<typeof tenantKycDocumentTypeSchema>;

export type PublicTenantKycDocumentType = z.infer<
  typeof publicTenantKycDocumentTypeSchema
>;

export type ManagerCurrentOccupantEvidenceDocumentType = z.infer<
  typeof managerCurrentOccupantEvidenceDocumentTypeSchema
>;

export type TenantKycUploadInput = z.infer<typeof tenantKycUploadSchema>;
