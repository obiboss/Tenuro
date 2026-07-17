import "server-only";

import { AppError } from "@/server/errors/app-error";
import { consumeManagerDocumentShareLink } from "@/server/repositories/manager-document-share-links.repository";
import {
  getManagerStatementDocumentById,
  MANAGER_STATEMENT_DOCUMENTS_BUCKET,
} from "@/server/repositories/manager-statement-documents.repository";
import { hashManagerDocumentShareToken } from "@/server/security/manager-document-share-token";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PublicManagerStatementDocumentDownload = {
  fileName: string;
  fileBuffer: ArrayBuffer;
};

export async function getPublicManagerStatementDocumentDownload(
  token: string,
): Promise<PublicManagerStatementDocumentDownload> {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashManagerDocumentShareToken(token);

  const shareLink =
    await consumeManagerDocumentShareLink(
      supabase,
      tokenHash,
    );

  if (!shareLink) {
    throw new AppError(
      "MANAGER_REPORT_SHARE_UNAVAILABLE",
      "This report link is unavailable or has expired.",
      404,
    );
  }

  const document = await getManagerStatementDocumentById(
    supabase,
    {
      organizationId: shareLink.organization_id,
      documentId: shareLink.statement_document_id,
    },
  );

  if (
    !document ||
    document.landlord_client_id !==
      shareLink.landlord_client_id
  ) {
    throw new AppError(
      "MANAGER_REPORT_SHARE_UNAVAILABLE",
      "This report link is unavailable or has expired.",
      404,
    );
  }

  const { data, error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .download(document.storage_path);

  if (error || !data) {
    throw new AppError(
      "MANAGER_REPORT_DOWNLOAD_UNAVAILABLE",
      "This report cannot be opened right now. Ask the property manager for a new link.",
      503,
    );
  }

  return {
    fileName: document.file_name,
    fileBuffer: await data.arrayBuffer(),
  };
}
