import "server-only";

import crypto from "node:crypto";
import { isOnboardingEditable } from "@/server/constants/onboarding-lifecycle";
import { AppError } from "@/server/errors/app-error";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { resolveTenantOnboardingToken } from "@/server/services/onboarding.service";
import { resolveManagerTenantOnboardingToken } from "@/server/services/manager-tenant-onboarding.service";
import type {
  ManagerCurrentOccupantEvidenceDocumentType,
  PublicTenantKycDocumentType,
  TenantKycDocumentType,
} from "@/server/validators/file.schema";

const TENANT_KYC_BUCKET = "tenant-kyc-documents";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function assertSupportedFile(file: File) {
  if (file.size <= 0) {
    throw new AppError("EMPTY_FILE", "Select a file to upload.", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      "FILE_TOO_LARGE",
      "Upload a file smaller than 5MB.",
      400,
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new AppError(
      "UNSUPPORTED_FILE_TYPE",
      "Upload a JPG, PNG, WEBP, or PDF file.",
      400,
    );
  }
}

function getExtensionForMimeType(mimeType: string) {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType];

  if (!extension) {
    throw new AppError(
      "UNSUPPORTED_FILE_TYPE",
      "Upload a JPG, PNG, WEBP, or PDF file.",
      400,
    );
  }

  return extension;
}

function createOnboardingStoragePath(params: {
  tenantId: string;
  documentType: TenantKycDocumentType;
  mimeType: string;
}) {
  return [
    params.tenantId,
    params.documentType,
    `${crypto.randomUUID()}.${getExtensionForMimeType(params.mimeType)}`,
  ].join("/");
}

function createPublicListingApplicationStoragePath(params: {
  agentPropertyListingId: string;
  documentType: PublicTenantKycDocumentType;
  mimeType: string;
}) {
  return [
    "public-listing-applications",
    params.agentPropertyListingId,
    params.documentType,
    `${crypto.randomUUID()}.${getExtensionForMimeType(params.mimeType)}`,
  ].join("/");
}

function safeFileName(fileName: string) {
  const fileNameWithoutExtension = fileName
    .trim()
    .replace(/\.[^./\\]+$/, "");

  const cleaned = fileNameWithoutExtension
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);

  return cleaned || "receipt";
}

function createManagerCurrentOccupantEvidenceStoragePath(params: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  requestId: string;
  fileName: string;
  mimeType: string;
}) {
  return [
    "manager",
    params.organizationId,
    "properties",
    params.propertyId,
    "units",
    params.unitId,
    "onboarding",
    params.requestId,
    "last-payment",
    `${crypto.randomUUID()}-${safeFileName(params.fileName)}.${getExtensionForMimeType(
      params.mimeType,
    )}`,
  ].join("/");
}

async function uploadFileToTenantKycBucket(params: {
  path: string;
  file: File;
}) {
  const supabase = createSupabaseAdminClient();
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await supabase.storage
    .from(TENANT_KYC_BUCKET)
    .upload(params.path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    bucket: TENANT_KYC_BUCKET,
    path: params.path,
    contentType: params.file.type,
    sizeBytes: params.file.size,
    fileName: params.file.name,
  };
}

function assertListingCanReceivePublicKycUpload(status: string) {
  if (status === "landlord_verified" || status === "converted") {
    return;
  }

  throw new AppError(
    "LISTING_NOT_AVAILABLE_FOR_KYC_UPLOAD",
    "This listing is not available for tenant applications.",
    400,
  );
}

export async function uploadTenantKycDocument(params: {
  token: string;
  documentType: TenantKycDocumentType;
  file: File;
}) {
  const tenant = await resolveTenantOnboardingToken(params.token);

  if (!isOnboardingEditable(tenant.onboarding_status)) {
    throw new AppError(
      "ONBOARDING_ALREADY_SUBMITTED",
      "This profile has already been submitted. Please contact the landlord if you need to make changes.",
      400,
    );
  }

  assertSupportedFile(params.file);

  const path = createOnboardingStoragePath({
    tenantId: tenant.id,
    documentType: params.documentType,
    mimeType: params.file.type,
  });

  return uploadFileToTenantKycBucket({
    path,
    file: params.file,
  });
}

export async function uploadPublicTenantListingKycDocument(params: {
  agentPropertyListingId: string;
  documentType: PublicTenantKycDocumentType;
  file: File;
}) {
  assertSupportedFile(params.file);

  const supabase = createSupabaseAdminClient();
  const listing = await getAgentPropertyListingById(
    supabase,
    params.agentPropertyListingId,
  );

  assertListingCanReceivePublicKycUpload(listing.status);

  const path = createPublicListingApplicationStoragePath({
    agentPropertyListingId: listing.id,
    documentType: params.documentType,
    mimeType: params.file.type,
  });

  return uploadFileToTenantKycBucket({
    path,
    file: params.file,
  });
}

export async function uploadManagerCurrentOccupantEvidenceDocument(params: {
  token: string;
  documentType: ManagerCurrentOccupantEvidenceDocumentType;
  file: File;
}) {
  void params.documentType;
  assertSupportedFile(params.file);

  const request = await resolveManagerTenantOnboardingToken(params.token);

  if (request.onboarding_type !== "current_occupant") {
    throw new AppError(
      "MANAGER_EXISTING_PAYMENT_UPLOAD_NOT_ALLOWED",
      "Last payment receipt upload is only available for existing tenants.",
      400,
    );
  }

  const path = createManagerCurrentOccupantEvidenceStoragePath({
    organizationId: request.organization_id,
    propertyId: request.property_id,
    unitId: request.unit_id,
    requestId: request.id,
    fileName: params.file.name,
    mimeType: params.file.type,
  });

  return uploadFileToTenantKycBucket({
    path,
    file: params.file,
  });
}
