import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import { resolveTenantOnboardingToken } from "@/server/services/onboarding.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { TenantKycDocumentType } from "@/server/validators/file.schema";

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

function createStoragePath(params: {
  tenantId: string;
  documentType: TenantKycDocumentType;
  mimeType: string;
}) {
  const extension = EXTENSION_BY_MIME_TYPE[params.mimeType];

  if (!extension) {
    throw new AppError(
      "UNSUPPORTED_FILE_TYPE",
      "Upload a JPG, PNG, WEBP, or PDF file.",
      400,
    );
  }

  return [
    params.tenantId,
    params.documentType,
    `${crypto.randomUUID()}.${extension}`,
  ].join("/");
}

export async function uploadTenantKycDocument(params: {
  token: string;
  documentType: TenantKycDocumentType;
  file: File;
}) {
  const tenant = await resolveTenantOnboardingToken(params.token);

  if (tenant.onboarding_status === "profile_complete") {
    throw new AppError(
      "ONBOARDING_ALREADY_SUBMITTED",
      "This profile has already been submitted. Please contact the landlord if you need to make changes.",
      400,
    );
  }

  if (params.file.size <= 0) {
    throw new AppError("EMPTY_FILE", "Select a file to upload.", 400);
  }

  if (params.file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      "FILE_TOO_LARGE",
      "Upload a file smaller than 5MB.",
      400,
    );
  }

  if (!ALLOWED_MIME_TYPES.has(params.file.type)) {
    throw new AppError(
      "UNSUPPORTED_FILE_TYPE",
      "Upload a JPG, PNG, WEBP, or PDF file.",
      400,
    );
  }

  const supabase = createSupabaseAdminClient();

  const path = createStoragePath({
    tenantId: tenant.id,
    documentType: params.documentType,
    mimeType: params.file.type,
  });

  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await supabase.storage
    .from(TENANT_KYC_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    bucket: TENANT_KYC_BUCKET,
    path,
    contentType: params.file.type,
    sizeBytes: params.file.size,
  };
}
