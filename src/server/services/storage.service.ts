import "server-only";

import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const TENANT_KYC_BUCKET = "tenant-kyc-documents";
const TENANCY_AGREEMENT_PDF_BUCKET = "tenancy-agreement-pdfs";
const RENT_RECEIPTS_BUCKET = "rent-receipts";
const DEVELOPER_PAYMENT_RECEIPTS_BUCKET = "developer-payment-receipts";
const DEVELOPER_SALE_DOCUMENTS_BUCKET = "developer-sale-documents";
const QUIT_NOTICE_PDF_BUCKET = "quit-notice-pdfs";
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

async function uploadPdfToBucket(params: {
  bucket: string;
  path: string;
  pdfBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return params.path;
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
  return uploadPdfToBucket({
    bucket: TENANCY_AGREEMENT_PDF_BUCKET,
    path: params.path,
    pdfBuffer: params.pdfBuffer,
  });
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
  return uploadPdfToBucket({
    bucket: RENT_RECEIPTS_BUCKET,
    path: params.path,
    pdfBuffer: params.pdfBuffer,
  });
}

export async function createSignedRentReceiptPdfUrl(path: string | null) {
  return createSignedStorageUrl({
    bucket: RENT_RECEIPTS_BUCKET,
    path,
  });
}

export async function uploadDeveloperPaymentReceiptPdf(params: {
  path: string;
  pdfBuffer: Buffer;
}) {
  return uploadPdfToBucket({
    bucket: DEVELOPER_PAYMENT_RECEIPTS_BUCKET,
    path: params.path,
    pdfBuffer: params.pdfBuffer,
  });
}

export async function createSignedDeveloperPaymentReceiptPdfUrl(
  path: string | null,
) {
  return createSignedStorageUrl({
    bucket: DEVELOPER_PAYMENT_RECEIPTS_BUCKET,
    path,
  });
}

export async function uploadDeveloperSaleDocumentPdf(params: {
  path: string;
  pdfBuffer: Buffer;
}) {
  return uploadPdfToBucket({
    bucket: DEVELOPER_SALE_DOCUMENTS_BUCKET,
    path: params.path,
    pdfBuffer: params.pdfBuffer,
  });
}

export async function createSignedDeveloperSaleDocumentPdfUrl(
  path: string | null,
) {
  return createSignedStorageUrl({
    bucket: DEVELOPER_SALE_DOCUMENTS_BUCKET,
    path,
  });
}

export async function uploadQuitNoticePdf(params: {
  path: string;
  pdfBuffer: Buffer;
}) {
  return uploadPdfToBucket({
    bucket: QUIT_NOTICE_PDF_BUCKET,
    path: params.path,
    pdfBuffer: params.pdfBuffer,
  });
}

export async function createSignedQuitNoticePdfUrl(path: string | null) {
  return createSignedStorageUrl({
    bucket: QUIT_NOTICE_PDF_BUCKET,
    path,
  });
}
