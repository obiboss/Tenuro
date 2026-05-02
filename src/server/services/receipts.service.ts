import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getRentPaymentById,
  markRentPaymentReceiptFailed,
  updateRentPaymentReceipt,
} from "@/server/repositories/payments.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import {
  createSignedRentReceiptPdfUrl,
  uploadRentReceiptPdf,
} from "@/server/services/storage.service";
import { requireLandlord } from "./auth.service";
import { renderRentReceiptPdf } from "./receipt-pdf.service";

function buildReceiptNumber(paymentId: string) {
  return `REC-${paymentId.slice(0, 8).toUpperCase()}`;
}

function buildReceiptPath(params: {
  landlordId: string;
  tenantId: string;
  tenancyId: string;
  paymentId: string;
}) {
  return [
    params.landlordId,
    params.tenantId,
    params.tenancyId,
    `${params.paymentId}.pdf`,
  ].join("/");
}

export async function generateRentReceiptForCurrentLandlord(paymentId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const payment = await getRentPaymentById(supabase, paymentId);

  if (payment.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this receipt.",
      403,
    );
  }

  if (payment.status !== "posted") {
    throw new AppError(
      "PAYMENT_NOT_POSTED",
      "Receipt can only be generated for a posted payment.",
      400,
    );
  }

  if (payment.receipt_path) {
    const receiptDownloadUrl = await createSignedRentReceiptPdfUrl(
      payment.receipt_path,
    );

    return {
      payment,
      receiptDownloadUrl,
    };
  }

  try {
    const receiptNumber =
      payment.receipt_number ?? buildReceiptNumber(payment.id);
    const paymentForPdf = {
      ...payment,
      receipt_number: receiptNumber,
    };

    const pdfBuffer = await renderRentReceiptPdf(paymentForPdf);
    const receiptPath = buildReceiptPath({
      landlordId: payment.landlord_id,
      tenantId: payment.tenant_id,
      tenancyId: payment.tenancy_id,
      paymentId: payment.id,
    });

    await uploadRentReceiptPdf({
      path: receiptPath,
      pdfBuffer,
    });

    const updatedPayment = await updateRentPaymentReceipt(supabase, {
      paymentId: payment.id,
      receiptPath,
      receiptNumber,
    });

    const receiptDownloadUrl = await createSignedRentReceiptPdfUrl(receiptPath);

    return {
      payment: updatedPayment,
      receiptDownloadUrl,
    };
  } catch (error) {
    await markRentPaymentReceiptFailed(supabase, payment.id);
    throw error;
  }
}

export async function getRentReceiptDownloadUrlForCurrentLandlord(
  paymentId: string,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const payment = await getRentPaymentById(supabase, paymentId);

  if (payment.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to download this receipt.",
      403,
    );
  }

  return createSignedRentReceiptPdfUrl(payment.receipt_path);
}
