import "server-only";

import { AppError } from "@/server/errors/app-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const TENANT_KYC_BUCKET = "tenant-kyc-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 10;

export type SignedKycDocument = {
  label: string;
  path: string | null;
  signedUrl: string | null;
};

async function createSignedTenantKycUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(TENANT_KYC_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

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
      createSignedTenantKycUrl(params.tenantIdDocumentPath),
      createSignedTenantKycUrl(params.tenantPassportPhotoPath),
      createSignedTenantKycUrl(params.guarantorIdDocumentPath),
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
