import "server-only";

import { AppError } from "@/server/errors/app-error";
import { renderDeveloperSaleDocumentPdfBuffer } from "@/server/pdf/developer-sale-document-pdf";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import {
  getDeveloperSaleDocumentByType,
  upsertGeneratedDeveloperSaleDocument,
  type DeveloperSaleDocumentRow,
} from "@/server/repositories/developer-sale-documents.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { requireDeveloperWorkspaceOperator } from "@/server/services/auth.service";
import { getDeveloperDocumentAutofillPreviewForCurrentDeveloper } from "@/server/services/developer-document-autofill.service";
import {
  createSignedDeveloperSaleDocumentPdfUrl,
  uploadDeveloperSaleDocumentPdf,
} from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type DeveloperSaleDocumentView = DeveloperSaleDocumentRow & {
  signedUrl: string | null;
};

const DIGITAL_COPY_NOTICE =
  "This is a digital copy generated through Boldverse Property for reference, record, printing, signing, and operational processing. It does not replace any physical original document issued by the developer.";

async function getDeveloperAccountForCurrentUser() {
  const developer = await requireDeveloperWorkspaceOperator();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account) {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_FOUND",
      "Developer account was not found.",
      404,
    );
  }

  return {
    developer,
    supabase,
    account,
  };
}

function createSalesAgreementStoragePath(params: {
  developerAccountId: string;
  saleId: string;
}) {
  return [
    params.developerAccountId,
    "sales",
    params.saleId,
    "sales-agreement.pdf",
  ].join("/");
}

function createAllocationLetterStoragePath(params: {
  developerAccountId: string;
  saleId: string;
}) {
  return [
    params.developerAccountId,
    "sales",
    params.saleId,
    "allocation-letter.pdf",
  ].join("/");
}

async function attachSignedUrl(
  document: DeveloperSaleDocumentRow | null,
): Promise<DeveloperSaleDocumentView | null> {
  if (!document) {
    return null;
  }

  const signedUrl = await createSignedDeveloperSaleDocumentPdfUrl(
    document.storage_path,
  );

  return {
    ...document,
    signedUrl,
  };
}

async function getVerifiedSaleForCurrentDeveloper(params: { saleId: string }) {
  const { supabase, account } = await getDeveloperAccountForCurrentUser();

  const sale = await getDeveloperSaleById(supabase, {
    developerAccountId: account.id,
    saleId: params.saleId,
  });

  if (!sale) {
    throw new AppError("DEVELOPER_SALE_NOT_FOUND", "Sale was not found.", 404);
  }

  return {
    supabase,
    account,
    sale,
  };
}

export async function getSalesAgreementDocumentForCurrentDeveloper(params: {
  saleId: string;
}) {
  const { supabase, account, sale } = await getVerifiedSaleForCurrentDeveloper({
    saleId: params.saleId,
  });

  const document = await getDeveloperSaleDocumentByType(supabase, {
    developerAccountId: account.id,
    saleId: sale.id,
    documentType: "sales_agreement",
  });

  return attachSignedUrl(document);
}

export async function getAllocationLetterDocumentForCurrentDeveloper(params: {
  saleId: string;
}) {
  const { supabase, account, sale } = await getVerifiedSaleForCurrentDeveloper({
    saleId: params.saleId,
  });

  const document = await getDeveloperSaleDocumentByType(supabase, {
    developerAccountId: account.id,
    saleId: sale.id,
    documentType: "allocation_letter",
  });

  return attachSignedUrl(document);
}

export async function generateSalesAgreementForCurrentDeveloper(params: {
  saleId: string;
}) {
  const { supabase, account, sale } = await getVerifiedSaleForCurrentDeveloper({
    saleId: params.saleId,
  });

  const preview = await getDeveloperDocumentAutofillPreviewForCurrentDeveloper({
    saleId: sale.id,
    templateType: "sales_agreement",
  });

  const bodyForPdf = preview.renderedBody.replace(
    /\{\{[a-zA-Z0-9_]+\}\}/g,
    "Not provided",
  );

  const pdfBuffer = await renderDeveloperSaleDocumentPdfBuffer({
    title: "Sales Agreement",
    subtitle: `Sale Reference: ${sale.sale_reference}`,
    body: bodyForPdf,
    notice: DIGITAL_COPY_NOTICE,
  });

  const storagePath = createSalesAgreementStoragePath({
    developerAccountId: account.id,
    saleId: sale.id,
  });

  await uploadDeveloperSaleDocumentPdf({
    path: storagePath,
    pdfBuffer,
  });

  const document = await upsertGeneratedDeveloperSaleDocument(supabase, {
    developerAccountId: account.id,
    saleId: sale.id,
    documentType: "sales_agreement",
    title: "Sales Agreement",
    storagePath,
    metadata: {
      generated_from_template: true,
      unresolved_placeholders: preview.unresolvedPlaceholders,
      missing_fields: preview.missingFields,
      digital_copy_notice: DIGITAL_COPY_NOTICE,
    },
  });

  return attachSignedUrl(document);
}

export async function generateAllocationLetterForCurrentDeveloper(params: {
  saleId: string;
}) {
  const { supabase, account, sale } = await getVerifiedSaleForCurrentDeveloper({
    saleId: params.saleId,
  });

  const preview = await getDeveloperDocumentAutofillPreviewForCurrentDeveloper({
    saleId: sale.id,
    templateType: "allocation_letter",
  });

  const bodyForPdf = preview.renderedBody.replace(
    /\{\{[a-zA-Z0-9_]+\}\}/g,
    "Not provided",
  );

  const pdfBuffer = await renderDeveloperSaleDocumentPdfBuffer({
    title: "Allocation Letter",
    subtitle: `Sale Reference: ${sale.sale_reference}`,
    body: bodyForPdf,
    notice: DIGITAL_COPY_NOTICE,
  });

  const storagePath = createAllocationLetterStoragePath({
    developerAccountId: account.id,
    saleId: sale.id,
  });

  await uploadDeveloperSaleDocumentPdf({
    path: storagePath,
    pdfBuffer,
  });

  const document = await upsertGeneratedDeveloperSaleDocument(supabase, {
    developerAccountId: account.id,
    saleId: sale.id,
    documentType: "allocation_letter",
    title: "Allocation Letter",
    storagePath,
    metadata: {
      generated_from_template: true,
      unresolved_placeholders: preview.unresolvedPlaceholders,
      missing_fields: preview.missingFields,
      digital_copy_notice: DIGITAL_COPY_NOTICE,
    },
  });

  return attachSignedUrl(document);
}
