import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getGatewayPaymentIntentByReference } from "@/server/repositories/gateway-payment.repository";
import {
  getRentPaymentById,
  markRentPaymentReceiptFailed,
  type RentPaymentRow,
  updateRentPaymentReceipt,
} from "@/server/repositories/payments.repository";
import {
  writeAuditLog,
  writeSystemAuditLog,
} from "@/server/services/audit-log.service";
import {
  createSignedRentReceiptPdfUrl,
  uploadRentReceiptPdf,
} from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { formatNaira } from "@/server/utils/money";
import { buildWaMeUrl } from "@/server/utils/whatsapp";
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

    await writeSystemAuditLog({
      landlordId: updatedPayment.landlord_id,
      tenantId: updatedPayment.tenant_id,
      tenancyId: updatedPayment.tenancy_id,
      eventType: AUDIT_EVENT_TYPES.receiptGenerated,
      entityType: AUDIT_ENTITY_TYPES.receipt,
      entityId: updatedPayment.id,
      description: "Rent receipt generated.",
      metadata: {
        payment_id: updatedPayment.id,
        receipt_number: updatedPayment.receipt_number,
        receipt_path: updatedPayment.receipt_path,
        amount_paid: updatedPayment.amount_paid,
        payment_date: updatedPayment.payment_date,
      },
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
  const landlord = await requireLandlord();
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

  const whatsappUrl = buildWaMeUrl({
    phoneNumber: receipt.payment.tenants?.phone_number,
    message,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: receipt.payment.tenant_id,
    tenancyId: receipt.payment.tenancy_id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.receiptWhatsappPrepared,
    entityType: AUDIT_ENTITY_TYPES.receipt,
    entityId: receipt.payment.id,
    description: "Rent receipt WhatsApp message prepared.",
    metadata: {
      payment_id: receipt.payment.id,
      receipt_number: receipt.payment.receipt_number,
      receipt_path: receipt.payment.receipt_path,
      tenant_phone_present: Boolean(receipt.payment.tenants?.phone_number),
    },
  });

  return {
    whatsappUrl,
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
