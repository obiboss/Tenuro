import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getDeveloperSalePaymentById,
  markDeveloperSalePaymentReceiptGenerated,
} from "@/server/repositories/developer-sale-payments.repository";
import type { DeveloperSalePaymentRow } from "@/server/repositories/developer-sale-payments.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import { renderDeveloperPaymentReceiptPdfBuffer } from "@/server/pdf/developer-payment-receipt-pdf";
import {
  createSignedDeveloperPaymentReceiptPdfUrl,
  uploadDeveloperPaymentReceiptPdf,
} from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { formatNaira } from "@/server/utils/money";

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function createDeveloperPaymentReceiptNumber(payment: DeveloperSalePaymentRow) {
  const compactReference = payment.payment_reference
    .replace(/[^a-z0-9]/gi, "")
    .slice(-10)
    .toUpperCase();

  return `BPD-RCPT-${compactReference}`;
}

function createDeveloperPaymentReceiptPath(params: {
  developerAccountId: string;
  paymentId: string;
}) {
  return `${params.developerAccountId}/${params.paymentId}.pdf`;
}

function getEstateLocation(sale: DeveloperSaleWithDetails) {
  return [
    sale.developer_estates?.location,
    sale.developer_estates?.city,
    sale.developer_estates?.lga,
    sale.developer_estates?.state,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildReceiptPdfData(params: {
  payment: DeveloperSalePaymentRow;
  sale: DeveloperSaleWithDetails;
  receiptNumber: string;
}) {
  const { payment, sale, receiptNumber } = params;

  return {
    receiptNumber,
    developerLabel: `Developer account ${payment.developer_account_id}`,
    buyerName: sale.developer_buyers?.full_name ?? "Buyer",
    estateName: sale.developer_estates?.estate_name ?? "Estate",
    estateLocation: getEstateLocation(sale) || "Not provided",
    plotLabel: `Plot ${sale.developer_plots?.plot_number ?? "—"} · ${
      sale.developer_plots?.size_label ?? "—"
    }`,
    saleReference: sale.sale_reference,
    paymentReference: payment.payment_reference,
    amountPaid: formatNaira(Number(payment.amount_paid)),
    platformFee: formatNaira(Number(payment.platform_fee_amount)),
    totalPaid: formatNaira(Number(payment.total_paid_amount)),
    paymentDate: formatReceiptDate(payment.payment_date),
    balanceBefore: formatNaira(Number(payment.balance_before)),
    balanceAfter: formatNaira(Number(payment.balance_after)),
  };
}

export async function generateDeveloperPaymentReceiptSystem(paymentId: string) {
  const paymentIdValue = paymentId.trim();

  if (!paymentIdValue) {
    throw new AppError(
      "DEVELOPER_PAYMENT_ID_REQUIRED",
      "Payment is required.",
      400,
    );
  }

  const supabase = createSupabaseAdminClient();
  const payment = await getDeveloperSalePaymentById(supabase, paymentIdValue);

  if (!payment) {
    throw new AppError(
      "DEVELOPER_PAYMENT_NOT_FOUND",
      "Developer payment was not found.",
      404,
    );
  }

  if (payment.status !== "posted") {
    throw new AppError(
      "DEVELOPER_PAYMENT_NOT_POSTED",
      "Receipt can only be generated for a posted developer payment.",
      400,
    );
  }

  if (payment.receipt_generated && payment.receipt_path) {
    const receiptDownloadUrl = await createSignedDeveloperPaymentReceiptPdfUrl(
      payment.receipt_path,
    );

    return {
      payment,
      receiptDownloadUrl,
    };
  }

  const sale = await getDeveloperSaleById(supabase, {
    developerAccountId: payment.developer_account_id,
    saleId: payment.sale_id,
  });

  if (!sale) {
    throw new AppError(
      "DEVELOPER_SALE_NOT_FOUND",
      "Developer sale was not found for this payment.",
      404,
    );
  }

  const receiptNumber =
    payment.receipt_number ?? createDeveloperPaymentReceiptNumber(payment);
  const receiptPath =
    payment.receipt_path ??
    createDeveloperPaymentReceiptPath({
      developerAccountId: payment.developer_account_id,
      paymentId: payment.id,
    });

  const pdfBuffer = await renderDeveloperPaymentReceiptPdfBuffer(
    buildReceiptPdfData({
      payment,
      sale,
      receiptNumber,
    }),
  );

  await uploadDeveloperPaymentReceiptPdf({
    path: receiptPath,
    pdfBuffer,
  });

  const updatedPayment = await markDeveloperSalePaymentReceiptGenerated(
    supabase,
    {
      paymentId: payment.id,
      receiptNumber,
      receiptPath,
    },
  );

  const receiptDownloadUrl =
    await createSignedDeveloperPaymentReceiptPdfUrl(receiptPath);

  return {
    payment: updatedPayment,
    receiptDownloadUrl,
  };
}
