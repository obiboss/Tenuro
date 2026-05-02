import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentByReference } from "@/server/repositories/gateway-payment.repository";
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
import { formatNaira } from "@/server/utils/money";
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

function normalizeNigerianWhatsAppPhone(
  phoneNumber: string | null | undefined,
) {
  if (!phoneNumber) {
    return null;
  }

  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length >= 13) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `234${digits}`;
  }

  return digits.length >= 10 ? digits : null;
}

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildReceiptWhatsAppMessage(params: {
  payment: RentPaymentRow;
  receiptDownloadUrl: string;
}) {
  const tenantName = params.payment.tenants?.full_name ?? "Tenant";
  const propertyName =
    params.payment.tenancies?.units?.properties?.property_name ??
    "the property";
  const unitIdentifier =
    params.payment.tenancies?.units?.unit_identifier ?? "your unit";
  const receiptNumber = params.payment.receipt_number ?? "your receipt";

  return [
    `Hello ${tenantName},`,
    "",
    `Your rent receipt ${receiptNumber} is ready on Tenuro.`,
    "",
    `Property: ${propertyName}`,
    `Unit: ${unitIdentifier}`,
    `Amount paid: ${formatNaira(Number(params.payment.amount_paid))}`,
    `Payment date: ${formatReceiptDate(params.payment.payment_date)}`,
    "",
    `Download receipt: ${params.receiptDownloadUrl}`,
    "",
    "Thank you.",
  ].join("\n");
}

function buildWhatsAppUrl(params: {
  phoneNumber: string | null | undefined;
  message: string;
}) {
  const normalizedPhone = normalizeNigerianWhatsAppPhone(params.phoneNumber);
  const encodedMessage = encodeURIComponent(params.message);

  if (!normalizedPhone) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
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

export async function prepareRentReceiptWhatsAppForCurrentLandlord(
  paymentId: string,
) {
  const receipt = await generateRentReceiptForCurrentLandlord(paymentId);

  if (!receipt.receiptDownloadUrl) {
    throw new AppError(
      "RECEIPT_LINK_FAILED",
      "Receipt link could not be prepared.",
      400,
    );
  }

  const message = buildReceiptWhatsAppMessage({
    payment: receipt.payment,
    receiptDownloadUrl: receipt.receiptDownloadUrl,
  });

  return {
    whatsappUrl: buildWhatsAppUrl({
      phoneNumber: receipt.payment.tenants?.phone_number,
      message,
    }),
  };
}

export async function getTenantRentReceiptDownloadUrlByGatewayReference(
  reference: string,
) {
  const supabase = createSupabaseAdminClient();

  const intent = await getGatewayPaymentIntentByReference(supabase, reference);

  if (!intent || intent.status !== "paid" || !intent.processed_payment_id) {
    return null;
  }

  const receipt = await generateRentReceiptSystem(intent.processed_payment_id);

  return receipt.receiptDownloadUrl;
}
