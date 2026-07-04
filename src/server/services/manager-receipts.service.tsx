import "server-only";

import type { Readable } from "node:stream";
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
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerReceiptDownload = {
  receipt: ManagerRentPaymentReceiptRow;
  fileBuffer: ArrayBuffer;
};

type PdfOutput = Buffer | Readable | ReadableStream<Uint8Array>;

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

async function webReadableStreamToBuffer(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (result.value) {
        chunks.push(result.value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

async function nodeReadableStreamToBuffer(stream: Readable) {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream as AsyncIterable<
    Buffer | Uint8Array | string
  >) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }

  return Buffer.concat(chunks);
}

async function pdfOutputToBuffer(output: PdfOutput) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if ("getReader" in output && typeof output.getReader === "function") {
    return webReadableStreamToBuffer(output);
  }

  return nodeReadableStreamToBuffer(output);
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

async function uploadReceiptPdf(params: {
  storagePath: string;
  fileBuffer: Buffer;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(MANAGER_RENT_RECEIPTS_BUCKET)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function downloadReceiptPdf(storagePath: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(MANAGER_RENT_RECEIPTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw error;
  }

  return data.arrayBuffer();
}

async function requireManagerOrganization(managerProfileId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    managerProfileId,
  );

  if (!organization || organization.status !== "active") {
    throw new AppError(
      "MANAGER_ORGANIZATION_REQUIRED",
      "Create an active BOPA Manager organization before continuing.",
      403,
    );
  }

  return organization;
}

export async function getOrCreateManagerRentReceipt(params: {
  managerProfileId: string;
  rentPaymentId: string;
}) {
  const organization = await requireManagerOrganization(
    params.managerProfileId,
  );
  const adminSupabase = createSupabaseAdminClient();

  const existingReceipt = await getManagerRentPaymentReceiptByPaymentId(
    adminSupabase,
    {
      organizationId: organization.id,
      rentPaymentId: params.rentPaymentId,
    },
  );

  if (existingReceipt) {
    return existingReceipt;
  }

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

  if (!canGenerateReceipt(snapshot.payment.status)) {
    throw new AppError(
      "MANAGER_RECEIPT_NOT_READY",
      "Receipt can only be generated after payment is recorded or confirmed.",
      400,
    );
  }

  const generatedAt = new Date().toISOString();
  const receiptNumber = createReceiptNumber({
    paymentId: snapshot.payment.id,
    paymentDate: snapshot.payment.paymentDate,
  });
  const fileName = createFileName(receiptNumber);
  const storagePath = createStoragePath({
    organizationId: organization.id,
    rentPaymentId: snapshot.payment.id,
    fileName,
  });

  const fileBuffer = await renderReceiptPdfBuffer({
    receiptNumber,
    generatedAt,
    snapshot,
  });

  await uploadReceiptPdf({
    storagePath,
    fileBuffer,
  });

  return createManagerRentPaymentReceipt(adminSupabase, {
    organizationId: organization.id,
    rentPaymentId: snapshot.payment.id,
    receiptNumber,
    storagePath,
    fileName,
    generatedByProfileId: params.managerProfileId,
    metadata: {
      source: "bopa_manager_receipt_generation",
      payment_status: snapshot.payment.status,
      amount_paid: snapshot.payment.amountPaid,
      tenant_name: snapshot.tenant.name,
      landlord_name: snapshot.landlord.name,
      property_name: snapshot.property.name,
      unit_label: snapshot.unit.label,
      manager_company_name: snapshot.organization.name,
      powered_by: "BOPA - Boldverse Property App",
    },
  });
}

export async function getManagerRentReceiptDownload(params: {
  managerProfileId: string;
  rentPaymentId: string;
}): Promise<ManagerReceiptDownload> {
  const receipt = await getOrCreateManagerRentReceipt(params);
  const fileBuffer = await downloadReceiptPdf(receipt.storage_path);

  return {
    receipt,
    fileBuffer,
  };
}
