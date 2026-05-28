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

export const tenantKycUploadSchema = z.union([
  onboardingTenantKycUploadSchema,
  publicTenantListingKycUploadSchema,
]);

export type TenantKycDocumentType = z.infer<typeof tenantKycDocumentTypeSchema>;

export type PublicTenantKycDocumentType = z.infer<
  typeof publicTenantKycDocumentTypeSchema
>;

export type TenantKycUploadInput = z.infer<typeof tenantKycUploadSchema>;
