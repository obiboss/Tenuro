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
} from "@/server/repositories/payments.repository";
import {
  writeAuditLog,
} from "@/server/services/audit-log.service";
import { generateCanonicalRentReceipt } from "@/server/services/rent-receipt-integrity.service";
import {
  createSignedRentReceiptPdfUrl,
} from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { formatNaira } from "@/server/utils/money";
import { buildWaMeUrl } from "@/server/utils/whatsapp";
import { requireLandlordPlatformOperator } from "./auth.service";

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
  const propertyUnitLabel = `${propertyName}, ${unitIdentifier}`;
  const rentPeriod =
    params.payment.payment_for_period_start &&
    params.payment.payment_for_period_end
      ? `${formatReceiptDate(params.payment.payment_for_period_start)} - ${formatReceiptDate(params.payment.payment_for_period_end)}`
      : formatReceiptDate(params.payment.payment_date);

  return [
    `Good day ${tenantName}.`,
    `Your rent receipt for ${propertyUnitLabel} has been generated with BOPA.`,
    `Amount: ${formatNaira(Number(params.payment.amount_paid))}.`,
    `Rent period: ${rentPeriod}.`,
    `View/download your receipt here: ${params.receiptDownloadUrl}`,
  ].join(" ");
}

async function generateRentReceiptWithClient(params: {
  supabase: SupabaseClient;
  payment: RentPaymentRow;
}) {
  try {
    return await generateCanonicalRentReceipt({
      supabase: params.supabase,
      payment: params.payment,
    });
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
  const landlord = await requireLandlordPlatformOperator();

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
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const payment = await getRentPaymentById(supabase, paymentId);

  if (payment.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to download this receipt.",
      403,
    );
  }

  if (!payment.receipt_path) {
    throw new AppError(
      "RECEIPT_NOT_GENERATED",
      "Receipt has not been generated for this payment yet.",
      404,
    );
  }

  return createSignedRentReceiptPdfUrl(payment.receipt_path);
}

export async function prepareRentReceiptWhatsAppForCurrentLandlord(
  paymentId: string,
) {
  const landlord = await requireLandlordPlatformOperator();
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
