import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getRentPaymentById,
  markRentPaymentReceiptFailed,
  type RentPaymentRow,
  updateRentPaymentReceipt,
} from "@/server/repositories/payments.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import {
  createSignedRentReceiptPdfUrl,
  uploadRentReceiptPdf,
} from "@/server/services/storage.service";
import { requireLandlord } from "./auth.service";
import { renderRentReceiptPdf } from "./receipt-pdf.service";
import type { SupabaseClient } from "@supabase/supabase-js";

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

async function generateRentReceiptWithClient(params: {
  supabase: SupabaseClient;
  payment: RentPaymentRow;
}) {
  if (params.payment.status !== "posted") {
    throw new AppError(
      "PAYMENT_NOT_POSTED",
      "Receipt can only be generated for a posted payment.",
      400,
    );
  }

  if (params.payment.receipt_path) {
    const receiptDownloadUrl = await createSignedRentReceiptPdfUrl(
      params.payment.receipt_path,
    );

    return {
      payment: params.payment,
      receiptDownloadUrl,
    };
  }

  try {
    const receiptNumber =
      params.payment.receipt_number ?? buildReceiptNumber(params.payment.id);

    const paymentForPdf: RentPaymentRow = {
      ...params.payment,
      receipt_number: receiptNumber,
    };

    const pdfBuffer = await renderRentReceiptPdf(paymentForPdf);

    const receiptPath = buildReceiptPath({
      landlordId: params.payment.landlord_id,
      tenantId: params.payment.tenant_id,
      tenancyId: params.payment.tenancy_id,
      paymentId: params.payment.id,
    });

    await uploadRentReceiptPdf({
      path: receiptPath,
      pdfBuffer,
    });

    const updatedPayment = await updateRentPaymentReceipt(params.supabase, {
      paymentId: params.payment.id,
      receiptPath,
      receiptNumber,
    });

    const receiptDownloadUrl = await createSignedRentReceiptPdfUrl(receiptPath);

    return {
      payment: updatedPayment,
      receiptDownloadUrl,
    };
  } catch (error) {
    try {
      await markRentPaymentReceiptFailed(params.supabase, params.payment.id);
    } catch (markFailedError) {
      console.error(
        "Failed to mark receipt generation as failed:",
        markFailedError,
      );
    }

    throw error;
  }
}

export async function generateRentReceiptForCurrentLandlord(paymentId: string) {
  const landlord = await requireLandlord();

  const userSupabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const payment = await getRentPaymentById(userSupabase, paymentId);

  if (payment.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this receipt.",
      403,
    );
  }

  return generateRentReceiptWithClient({
    supabase: adminSupabase,
    payment,
  });
}

export async function generateRentReceiptSystem(paymentId: string) {
  const adminSupabase = createSupabaseAdminClient();
  const payment = await getRentPaymentById(adminSupabase, paymentId);

  return generateRentReceiptWithClient({
    supabase: adminSupabase,
    payment,
  });
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
