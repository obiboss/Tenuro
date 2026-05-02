import "server-only";

import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const TENANT_KYC_BUCKET = "tenant-kyc-documents";
const TENANCY_AGREEMENT_PDF_BUCKET = "tenancy-agreement-pdfs";
const RENT_RECEIPTS_BUCKET = "rent-receipts";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10;

export type SignedKycDocument = {
  label: string;
  path: string | null;
  signedUrl: string | null;
};

async function createSignedStorageUrl(params: {
  bucket: string;
  path: string | null;
}) {
  if (!params.path) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    throw new AppError(
      "DOCUMENT_LINK_FAILED",
      "We could not prepare this document link. Please try again.",
      400,
    );
  }

  return data.signedUrl;
}

export async function createTenantKycDocumentLinks(params: {
  tenantIdDocumentPath: string | null;
  tenantPassportPhotoPath: string | null;
  guarantorIdDocumentPath: string | null;
}) {
  const [tenantIdDocumentUrl, tenantPassportPhotoUrl, guarantorIdDocumentUrl] =
    await Promise.all([
      createSignedStorageUrl({
        bucket: TENANT_KYC_BUCKET,
        path: params.tenantIdDocumentPath,
      }),
      createSignedStorageUrl({
        bucket: TENANT_KYC_BUCKET,
        path: params.tenantPassportPhotoPath,
      }),
      createSignedStorageUrl({
        bucket: TENANT_KYC_BUCKET,
        path: params.guarantorIdDocumentPath,
      }),
    ]);

  return {
    tenantIdDocument: {
      label: "Tenant ID document",
      path: params.tenantIdDocumentPath,
      signedUrl: tenantIdDocumentUrl,
    },
    tenantPassportPhoto: {
      label: "Tenant passport photo",
      path: params.tenantPassportPhotoPath,
      signedUrl: tenantPassportPhotoUrl,
    },
    guarantorIdDocument: {
      label: "Guarantor ID document",
      path: params.guarantorIdDocumentPath,
      signedUrl: guarantorIdDocumentUrl,
    },
  };
}

export async function uploadTenancyAgreementPdf(params: {
  path: string;
  pdfBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(TENANCY_AGREEMENT_PDF_BUCKET)
    .upload(params.path, params.pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return params.path;
}

export async function createSignedTenancyAgreementPdfUrl(path: string | null) {
  return createSignedStorageUrl({
    bucket: TENANCY_AGREEMENT_PDF_BUCKET,
    path,
  });
}

export async function uploadRentReceiptPdf(params: {
  path: string;
  pdfBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(RENT_RECEIPTS_BUCKET)
    .upload(params.path, params.pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return params.path;
}

export async function createSignedRentReceiptPdfUrl(path: string | null) {
  return createSignedStorageUrl({
    bucket: RENT_RECEIPTS_BUCKET,
    path,
  });
}
