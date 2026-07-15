import "server-only";

import { Readable } from "node:stream";
import { pdf } from "@react-pdf/renderer";
import { AppError } from "@/server/errors/app-error";
import { ManagerRentReceiptPdf } from "@/server/pdf/manager-rent-receipt-pdf";
import {
  createManagerRentPaymentReceipt,
  getManagerRentPaymentReceiptByPaymentId,
  getManagerRentReceiptSnapshot,
  MANAGER_RENT_RECEIPTS_BUCKET,
  type ManagerRentPaymentReceiptRow,
  type ManagerRentReceiptSnapshot,
} from "@/server/repositories/manager-receipts.repository";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type ManagerReceiptDownload = {
  receipt: ManagerRentPaymentReceiptRow;
  fileBuffer: ArrayBuffer;
};

export const MANAGER_RECEIPT_NOT_READY_MESSAGE =
  "Your payment is confirmed, but the receipt is not ready yet. Please try again shortly.";

export type ManagerReceiptShareLink = {
  whatsappUrl: string;
};

type WebPdfReadableStream = ReadableStream<Uint8Array<ArrayBufferLike>>;
type PdfOutput = Buffer | Readable | WebPdfReadableStream;

function createReceiptNumber(params: {
  paymentId: string;
  paymentDate: string;
}) {
  const date = new Date(params.paymentDate);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  const shortId = params.paymentId
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();

  return `BMR-${year}${month}${day}-${shortId}`;
}

function createFileName(receiptNumber: string) {
  return `${receiptNumber}.pdf`;
}

function createStoragePath(params: {
  organizationId: string;
  rentPaymentId: string;
  fileName: string;
}) {
  return `${params.organizationId}/${params.rentPaymentId}/${params.fileName}`;
}

function canGenerateReceipt(
  status: ManagerRentReceiptSnapshot["payment"]["status"],
) {
  return status === "verified" || status === "recorded";
}

function createReceiptNotReadyError() {
  return new AppError(
    "MANAGER_RECEIPT_NOT_READY",
    MANAGER_RECEIPT_NOT_READY_MESSAGE,
    503,
  );
}

function createReceiptMetadata(snapshot: ManagerRentReceiptSnapshot) {
  return {
    source: "bopa_manager_receipt_generation",
    payment_status: snapshot.payment.status,
    amount_paid: snapshot.payment.amountPaid,
    tenant_name: snapshot.tenant.name,
    landlord_name: snapshot.landlord.name,
    property_name: snapshot.property.name,
    unit_label: snapshot.unit.label,
    manager_company_name: snapshot.organization.name,
    powered_by: "BOPA - Boldverse Property App",
  };
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
    "MANAGER_RECEIPT_PDF_RENDER_FAILED",
    "Receipt could not be prepared.",
    500,
  );
}

async function renderReceiptPdfBuffer(params: {
  receiptNumber: string;
  generatedAt: string;
  snapshot: ManagerRentReceiptSnapshot;
}) {
  const rendered = (await pdf(
    <ManagerRentReceiptPdf
      receiptNumber={params.receiptNumber}
      generatedAt={params.generatedAt}
      snapshot={params.snapshot}
    />,
  ).toBuffer()) as PdfOutput;

  return pdfOutputToBuffer(rendered);
}

async function renderAndUploadReceiptPdf(params: {
  receiptNumber: string;
  generatedAt: string;
  snapshot: ManagerRentReceiptSnapshot;
  storageBucket?: string;
  storagePath: string;
}) {
  const fileBuffer = await renderReceiptPdfBuffer({
    receiptNumber: params.receiptNumber,
    generatedAt: params.generatedAt,
    snapshot: params.snapshot,
  });

  await uploadReceiptPdf({
    storageBucket: params.storageBucket,
    storagePath: params.storagePath,
    fileBuffer,
  });

  return fileBuffer;
}

async function uploadReceiptPdf(params: {
  storageBucket?: string;
  storagePath: string;
  fileBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(params.storageBucket || MANAGER_RENT_RECEIPTS_BUCKET)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function downloadStoredReceiptPdf(params: {
  storageBucket: string;
  storagePath: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(params.storageBucket || MANAGER_RENT_RECEIPTS_BUCKET)
    .download(params.storagePath);

  if (error || !data) {
    throw error;
  }

  return data.arrayBuffer();
}

async function getReceiptSnapshotForGeneration(params: {
  organizationId: string;
  rentPaymentId: string;
}) {
  const adminSupabase = createSupabaseAdminClient();
  const snapshot = await getManagerRentReceiptSnapshot(adminSupabase, {
    organizationId: params.organizationId,
    rentPaymentId: params.rentPaymentId,
  });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_PAYMENT_NOT_FOUND",
      "Payment record was not found.",
      404,
    );
  }

  if (!canGenerateReceipt(snapshot.payment.status)) {
    throw new AppError(
      "MANAGER_RECEIPT_NOT_READY",
      "Receipt can only be generated after payment is recorded or confirmed.",
      400,
    );
  }

  return snapshot;
}

async function regenerateStoredReceiptPdf(params: {
  organizationId: string;
  rentPaymentId: string;
  receipt: ManagerRentPaymentReceiptRow;
}) {
  const snapshot = await getReceiptSnapshotForGeneration({
    organizationId: params.organizationId,
    rentPaymentId: params.rentPaymentId,
  });

  return renderAndUploadReceiptPdf({
    receiptNumber: params.receipt.receipt_number,
    generatedAt: params.receipt.generated_at,
    snapshot,
    storageBucket: params.receipt.storage_bucket,
    storagePath: params.receipt.storage_path,
  });
}

async function downloadOrRecoverReceiptPdf(params: {
  organizationId: string;
  rentPaymentId: string;
  receipt: ManagerRentPaymentReceiptRow;
}) {
  try {
    return await downloadStoredReceiptPdf({
      storageBucket: params.receipt.storage_bucket,
      storagePath: params.receipt.storage_path,
    });
  } catch (downloadError) {
    console.error("manager receipt PDF download failed; attempting recovery", {
      organizationId: params.organizationId,
      rentPaymentId: params.rentPaymentId,
      receiptId: params.receipt.id,
      error:
        downloadError instanceof Error
          ? {
              name: downloadError.name,
              message: downloadError.message,
            }
          : "Unknown receipt download error",
    });
  }

  try {
    const recoveredBuffer = await regenerateStoredReceiptPdf(params);
    const fileBuffer = new ArrayBuffer(recoveredBuffer.byteLength);

    new Uint8Array(fileBuffer).set(recoveredBuffer);

    return fileBuffer;
  } catch (recoveryError) {
    console.error("manager receipt PDF recovery failed", {
      organizationId: params.organizationId,
      rentPaymentId: params.rentPaymentId,
      receiptId: params.receipt.id,
      error:
        recoveryError instanceof Error
          ? {
              name: recoveryError.name,
              message: recoveryError.message,
            }
          : "Unknown receipt recovery error",
    });

    throw createReceiptNotReadyError();
  }
}

async function createReceiptSignedUrl(params: {
  storageBucket: string;
  storagePath: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(params.storageBucket || MANAGER_RENT_RECEIPTS_BUCKET)
    .createSignedUrl(params.storagePath, 60 * 60 * 24 * 7);

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

async function requireManagerReceiptAccess(managerProfileId: string) {
  const { manager, access } =
    await requireManagerWorkspacePermission("payment.manage");

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

export async function getOrCreateManagerRentReceipt(params: {
  managerProfileId: string;
  rentPaymentId: string;
}) {
  const organization = await requireManagerReceiptAccess(
    params.managerProfileId,
  );

  return getOrCreateManagerRentReceiptForPayment({
    organizationId: organization.id,
    rentPaymentId: params.rentPaymentId,
    generatedByProfileId: params.managerProfileId,
  });
}

export async function getOrCreateManagerRentReceiptForPayment(params: {
  organizationId: string;
  rentPaymentId: string;
  generatedByProfileId: string | null;
}) {
  const adminSupabase = createSupabaseAdminClient();
  const snapshot = await getReceiptSnapshotForGeneration({
    organizationId: params.organizationId,
    rentPaymentId: params.rentPaymentId,
  });
  const existingReceipt = await getManagerRentPaymentReceiptByPaymentId(
    adminSupabase,
    {
      organizationId: params.organizationId,
      rentPaymentId: params.rentPaymentId,
    },
  );

  if (existingReceipt) {
    return existingReceipt;
  }

  const generatedAt = new Date().toISOString();
  const receiptNumber = createReceiptNumber({
    paymentId: snapshot.payment.id,
    paymentDate: snapshot.payment.paymentDate,
  });
  const fileName = createFileName(receiptNumber);
  const storagePath = createStoragePath({
    organizationId: params.organizationId,
    rentPaymentId: snapshot.payment.id,
    fileName,
  });

  let storedPdfExists = false;

  try {
    await downloadStoredReceiptPdf({
      storageBucket: MANAGER_RENT_RECEIPTS_BUCKET,
      storagePath,
    });

    storedPdfExists = true;
  } catch {
    storedPdfExists = false;
  }

  if (storedPdfExists) {
    return createManagerRentPaymentReceipt(adminSupabase, {
      organizationId: params.organizationId,
      rentPaymentId: snapshot.payment.id,
      receiptNumber,
      storagePath,
      fileName,
      generatedByProfileId: params.generatedByProfileId,
      metadata: createReceiptMetadata(snapshot),
    });
  }

  await renderAndUploadReceiptPdf({
    receiptNumber,
    generatedAt,
    snapshot,
    storagePath,
  });

  return createManagerRentPaymentReceipt(adminSupabase, {
    organizationId: params.organizationId,
    rentPaymentId: snapshot.payment.id,
    receiptNumber,
    storagePath,
    fileName,
    generatedByProfileId: params.generatedByProfileId,
    metadata: createReceiptMetadata(snapshot),
  });
}

export async function getManagerRentReceiptDownload(params: {
  managerProfileId: string;
  rentPaymentId: string;
}): Promise<ManagerReceiptDownload> {
  const organization = await requireManagerReceiptAccess(
    params.managerProfileId,
  );
  const receipt = await getOrCreateManagerRentReceiptForPayment({
    organizationId: organization.id,
    rentPaymentId: params.rentPaymentId,
    generatedByProfileId: params.managerProfileId,
  });
  const fileBuffer = await downloadOrRecoverReceiptPdf({
    organizationId: organization.id,
    rentPaymentId: params.rentPaymentId,
    receipt,
  });

  return {
    receipt,
    fileBuffer,
  };
}

export async function getManagerRentReceiptDownloadForPayment(params: {
  organizationId: string;
  rentPaymentId: string;
  generatedByProfileId: string | null;
}): Promise<ManagerReceiptDownload> {
  const receipt = await getOrCreateManagerRentReceiptForPayment(params);
  const fileBuffer = await downloadOrRecoverReceiptPdf({
    organizationId: params.organizationId,
    rentPaymentId: params.rentPaymentId,
    receipt,
  });

  return {
    receipt,
    fileBuffer,
  };
}

export async function ensureManagerRentReceiptPdfForPayment(params: {
  organizationId: string;
  rentPaymentId: string;
  generatedByProfileId: string | null;
}) {
  const receipt = await getOrCreateManagerRentReceiptForPayment(params);

  await downloadOrRecoverReceiptPdf({
    organizationId: params.organizationId,
    rentPaymentId: params.rentPaymentId,
    receipt,
  });

  return receipt;
}

export async function getManagerRentReceiptWhatsAppLink(params: {
  managerProfileId: string;
  rentPaymentId: string;
}): Promise<ManagerReceiptShareLink> {
  const organization = await requireManagerReceiptAccess(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const snapshot = await getManagerRentReceiptSnapshot(adminSupabase, {
    organizationId: organization.id,
    rentPaymentId: params.rentPaymentId,
  });

  if (!snapshot) {
    throw new AppError(
      "MANAGER_PAYMENT_NOT_FOUND",
      "Payment record was not found.",
      404,
    );
  }

  const receipt = await getOrCreateManagerRentReceipt(params);
  await downloadOrRecoverReceiptPdf({
    organizationId: organization.id,
    rentPaymentId: params.rentPaymentId,
    receipt,
  });
  const signedUrl = await createReceiptSignedUrl({
    storageBucket: receipt.storage_bucket,
    storagePath: receipt.storage_path,
  });
  const phoneNumber = normalizeWhatsAppPhone(snapshot.tenant.phone);

  if (!phoneNumber) {
    throw new AppError(
      "MANAGER_RECEIPT_PHONE_MISSING",
      "Tenant phone number is missing.",
      400,
    );
  }

  const message = [
    `Hello ${snapshot.tenant.name},`,
    "",
    `Your rent receipt from ${snapshot.organization.name} is ready.`,
    "",
    `Receipt number: ${receipt.receipt_number}`,
    `Property: ${snapshot.property.name}`,
    `Unit: ${snapshot.unit.label}`,
    "",
    `Download receipt: ${signedUrl}`,
  ].join("\n");

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber,
      message,
    }),
  };
}
