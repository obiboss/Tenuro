import "server-only";

import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const TENANT_KYC_BUCKET = "tenant-kyc-documents";
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

export async function createExistingTenantPaymentEvidenceLink(params: {
  path: string | null;
  fileName: string | null;
}) {
  const signedUrl = await createSignedStorageUrl({
    bucket: TENANT_KYC_BUCKET,
    path: params.path,
  });

  return {
    label: params.fileName ?? "Last payment receipt",
    path: params.path,
    signedUrl,
  };
}

const EXISTING_TENANT_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function createExistingTenantEvidencePrefix(params: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  requestId: string;
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
    "",
  ].join("/");
}

function getExistingTenantEvidenceFileName(path: string) {
  const storedFileName = path.split("/").at(-1)?.trim();

  if (!storedFileName) {
    return "Last payment receipt";
  }

  return storedFileName.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  );
}

export async function verifyExistingTenantPaymentEvidenceUpload(params: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  requestId: string;
  path: string;
  submittedMimeType: string;
  submittedSizeBytes: number;
}) {
  const expectedPrefix = createExistingTenantEvidencePrefix(params);

  if (
    !params.path.startsWith(expectedPrefix) ||
    params.path.includes("..") ||
    params.path.includes("\\")
  ) {
    throw new AppError(
      "MANAGER_EXISTING_PAYMENT_EVIDENCE_INVALID",
      "The uploaded receipt does not belong to this tenant request.",
      400,
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(TENANT_KYC_BUCKET)
    .download(params.path);

  if (error || !data) {
    throw new AppError(
      "MANAGER_EXISTING_PAYMENT_EVIDENCE_NOT_FOUND",
      "The uploaded receipt could not be found. Upload it again.",
      400,
    );
  }

  const actualMimeType = data.type.trim().toLowerCase();
  const submittedMimeType = params.submittedMimeType.trim().toLowerCase();

  if (
    !EXISTING_TENANT_EVIDENCE_MIME_TYPES.has(actualMimeType) ||
    actualMimeType !== submittedMimeType
  ) {
    throw new AppError(
      "MANAGER_EXISTING_PAYMENT_EVIDENCE_TYPE_MISMATCH",
      "The uploaded receipt type could not be verified. Upload it again.",
      400,
    );
  }

  if (
    data.size <= 0 ||
    data.size !== params.submittedSizeBytes ||
    data.size > 5 * 1024 * 1024
  ) {
    throw new AppError(
      "MANAGER_EXISTING_PAYMENT_EVIDENCE_SIZE_MISMATCH",
      "The uploaded receipt could not be verified. Upload it again.",
      400,
    );
  }

  return {
    path: params.path,
    fileName: getExistingTenantEvidenceFileName(params.path),
    mimeType: actualMimeType,
    sizeBytes: data.size,
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

export async function downloadTenancyAgreementPdf(path: string | null) {
  if (!path) {
    throw new AppError(
      "TENANCY_AGREEMENT_PDF_MISSING",
      "Agreement PDF is not available yet.",
      404,
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(TENANCY_AGREEMENT_PDF_BUCKET)
    .download(path);

  if (error || !data) {
    throw error;
  }

  return data.arrayBuffer();
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
