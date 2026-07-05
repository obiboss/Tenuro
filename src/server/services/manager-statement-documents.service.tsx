import "server-only";

import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pdf } from "@react-pdf/renderer";
import { AppError } from "@/server/errors/app-error";
import { ManagerLandlordStatementPdf } from "@/server/pdf/manager-landlord-statement-pdf";
import { ManagerRemittanceSummaryPdf } from "@/server/pdf/manager-remittance-summary-pdf";
import {
  getManagerLandlordStatementSnapshot,
  MANAGER_STATEMENT_DOCUMENTS_BUCKET,
  upsertManagerStatementDocument,
  type ManagerStatementDocumentType,
} from "@/server/repositories/manager-statement-documents.repository";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { ManagerStatementDocumentQueryInput } from "@/server/validators/manager-statement-documents.schema";

type ManagerStatementDownload = {
  fileName: string;
  fileBuffer: ArrayBuffer;
};

export type ManagerStatementShareLink = {
  whatsappUrl: string;
};

type WebPdfReadableStream = ReadableStream<Uint8Array<ArrayBufferLike>>;
type PdfOutput = Buffer | Readable | WebPdfReadableStream;

function createHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function createDocumentNumber(params: {
  documentType: ManagerStatementDocumentType;
  landlordClientId: string;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const prefix = params.documentType === "landlord_statement" ? "BMS" : "BMR";
  const dateScope = `${params.dateFrom ?? "start"}-${params.dateTo ?? "today"}`;
  const shortHash = createHash(
    `${params.landlordClientId}:${dateScope}`,
  ).toUpperCase();

  return `${prefix}-${shortHash}`;
}

function createIdempotencyKey(params: {
  organizationId: string;
  landlordClientId: string;
  documentType: ManagerStatementDocumentType;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  return [
    "manager-statement-document",
    params.documentType,
    params.organizationId,
    params.landlordClientId,
    params.dateFrom ?? "start",
    params.dateTo ?? "today",
  ].join(":");
}

function createFileName(params: {
  documentType: ManagerStatementDocumentType;
  documentNumber: string;
}) {
  const label =
    params.documentType === "landlord_statement"
      ? "landlord-statement"
      : "remittance-summary";

  return `${label}-${params.documentNumber}.pdf`;
}

function createStoragePath(params: {
  organizationId: string;
  landlordClientId: string;
  documentType: ManagerStatementDocumentType;
  fileName: string;
}) {
  return `${params.organizationId}/${params.landlordClientId}/${params.documentType}/${params.fileName}`;
}

function isWebReadableStream(
  output: PdfOutput,
): output is WebPdfReadableStream {
  return typeof (output as { getReader?: unknown }).getReader === "function";
}

function isNodeReadableStream(output: PdfOutput): output is Readable {
  return output instanceof Readable;
}

async function webReadableStreamToBuffer(stream: WebPdfReadableStream) {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];

  try {
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (result.value) {
        chunks.push(Buffer.from(result.value));
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

async function nodeReadableStreamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<unknown>) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
      continue;
    }

    if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    chunks.push(Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks);
}

async function pdfOutputToBuffer(output: PdfOutput) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (isWebReadableStream(output)) {
    return webReadableStreamToBuffer(output);
  }

  if (isNodeReadableStream(output)) {
    return nodeReadableStreamToBuffer(output);
  }

  throw new AppError(
    "MANAGER_STATEMENT_PDF_RENDER_FAILED",
    "Document could not be prepared.",
    500,
  );
}

async function renderDocumentBuffer(params: {
  documentType: ManagerStatementDocumentType;
  documentNumber: string;
  snapshot: Awaited<ReturnType<typeof getManagerLandlordStatementSnapshot>>;
}) {
  if (!params.snapshot) {
    throw new AppError(
      "MANAGER_STATEMENT_NOT_FOUND",
      "Statement details could not be found.",
      404,
    );
  }

  const document =
    params.documentType === "landlord_statement" ? (
      <ManagerLandlordStatementPdf
        documentNumber={params.documentNumber}
        snapshot={params.snapshot}
      />
    ) : (
      <ManagerRemittanceSummaryPdf
        documentNumber={params.documentNumber}
        snapshot={params.snapshot}
      />
    );

  const rendered = (await pdf(document).toBuffer()) as PdfOutput;

  return pdfOutputToBuffer(rendered);
}

async function uploadPdf(params: { storagePath: string; fileBuffer: Buffer }) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function downloadPdf(storagePath: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw error;
  }

  return data.arrayBuffer();
}

async function createStatementSignedUrl(storagePath: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(MANAGER_STATEMENT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    throw error;
  }

  return data.signedUrl;
}

function normalizeWhatsAppPhone(phoneNumber: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const cleaned = phoneNumber.replace(/\D/g, "");

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("234")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `234${cleaned.slice(1)}`;
  }

  return cleaned;
}

function buildWhatsAppUrl(params: { phoneNumber: string; message: string }) {
  return `https://wa.me/${params.phoneNumber}?text=${encodeURIComponent(
    params.message,
  )}`;
}

async function requireManagerStatementAccess(managerProfileId: string) {
  const { manager, access } =
    await requireManagerWorkspacePermission("reports.view");

  if (manager.id !== managerProfileId) {
    throw new AppError(
      "MANAGER_SESSION_MISMATCH",
      "Please sign in again to continue.",
      401,
    );
  }

  if (!access.organization || access.organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create or join an active BOPA Manager organization before continuing.",
      403,
    );
  }

  return access.organization;
}

export async function generateManagerStatementDocument(params: {
  managerProfileId: string;
  documentType: ManagerStatementDocumentType;
  input: ManagerStatementDocumentQueryInput;
}) {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot = await getManagerLandlordStatementSnapshot(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: params.input.landlordClientId,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_STATEMENT_NOT_FOUND",
      "Statement details could not be found.",
      404,
    );
  }

  const documentNumber = createDocumentNumber({
    documentType: params.documentType,
    landlordClientId: params.input.landlordClientId,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });

  const fileName = createFileName({
    documentType: params.documentType,
    documentNumber,
  });

  const storagePath = createStoragePath({
    organizationId: organization.id,
    landlordClientId: params.input.landlordClientId,
    documentType: params.documentType,
    fileName,
  });

  const idempotencyKey = createIdempotencyKey({
    organizationId: organization.id,
    landlordClientId: params.input.landlordClientId,
    documentType: params.documentType,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });

  const fileBuffer = await renderDocumentBuffer({
    documentType: params.documentType,
    documentNumber,
    snapshot,
  });

  await uploadPdf({
    storagePath,
    fileBuffer,
  });

  const document = await upsertManagerStatementDocument(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: params.input.landlordClientId,
    documentType: params.documentType,
    idempotencyKey,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
    documentNumber,
    storagePath,
    fileName,
    generatedByProfileId: params.managerProfileId,
    metadata: {
      source: "bopa_manager_statement_generation",
      document_type: params.documentType,
      landlord_name: snapshot.landlord.name,
      manager_company_name: snapshot.organization.name,
      date_from: params.input.dateFrom,
      date_to: params.input.dateTo,
      total_rent_recorded: snapshot.totals.totalRentRecorded,
      manager_commission: snapshot.totals.managerCommission,
      amount_due_to_landlord: snapshot.totals.amountDueToLandlord,
      amount_remitted: snapshot.totals.amountRemitted,
      balance_due: snapshot.totals.pendingLandlordBalance,
      powered_by: "BOPA - Boldverse Property App",
    },
  });

  return document;
}

export async function getManagerStatementDocumentDownload(params: {
  managerProfileId: string;
  documentType: ManagerStatementDocumentType;
  input: ManagerStatementDocumentQueryInput;
}): Promise<ManagerStatementDownload> {
  const document = await generateManagerStatementDocument(params);
  const fileBuffer = await downloadPdf(document.storage_path);

  return {
    fileName: document.file_name,
    fileBuffer,
  };
}

export async function getManagerStatementWhatsAppLink(params: {
  managerProfileId: string;
  documentType: ManagerStatementDocumentType;
  input: ManagerStatementDocumentQueryInput;
}): Promise<ManagerStatementShareLink> {
  const organization = await requireManagerStatementAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot = await getManagerLandlordStatementSnapshot(adminSupabase, {
    organizationId: organization.id,
    landlordClientId: params.input.landlordClientId,
    dateFrom: params.input.dateFrom,
    dateTo: params.input.dateTo,
  });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_STATEMENT_NOT_FOUND",
      "Statement details could not be found.",
      404,
    );
  }

  const document = await generateManagerStatementDocument(params);
  const signedUrl = await createStatementSignedUrl(document.storage_path);
  const phoneNumber = normalizeWhatsAppPhone(snapshot.landlord.phone);

  if (!phoneNumber) {
    throw new AppError(
      "MANAGER_LANDLORD_PHONE_MISSING",
      "Landlord phone number is missing.",
      400,
    );
  }

  const label =
    params.documentType === "landlord_statement"
      ? "landlord statement"
      : "remittance summary";

  const message = [
    `Hello ${snapshot.landlord.name},`,
    "",
    `Your ${label} from ${snapshot.organization.name} is ready.`,
    "",
    `Document number: ${document.document_number}`,
    `Amount remitted: ${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(snapshot.totals.amountRemitted)}`,
    `Balance due: ${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(snapshot.totals.pendingLandlordBalance)}`,
    "",
    `Download document: ${signedUrl}`,
  ].join("\n");

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber,
      message,
    }),
  };
}
