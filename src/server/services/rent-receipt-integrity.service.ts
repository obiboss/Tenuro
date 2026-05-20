import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import {
  getRentPaymentById,
  type RentPaymentRow,
} from "@/server/repositories/payments.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { assertReceiptMatchesPayment } from "@/server/services/tenancy-financial-integrity.service";
import {
  createSignedRentReceiptPdfUrl,
  uploadRentReceiptPdf,
} from "@/server/services/storage.service";
import { renderRentReceiptPdf } from "@/server/services/receipt-pdf.service";

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

export type RentReceiptGenerationResult = {
  payment: RentPaymentRow;
  receiptDownloadUrl: string | null;
  wasReplay: boolean;
};

async function persistRentPaymentReceipt(params: {
  supabase: SupabaseClient;
  paymentId: string;
  receiptPath: string;
  receiptNumber: string;
}) {
  const { data, error } = await params.supabase
    .from("rent_payments")
    .update({
      receipt_number: params.receiptNumber,
      receipt_path: params.receiptPath,
      receipt_generated: true,
      receipt_status: "generated",
      verified_at: new Date().toISOString(),
    })
    .eq("id", params.paymentId)
    .eq("status", "posted")
    .is("receipt_path", null)
    .select(
      "id, landlord_id, tenant_id, tenancy_id, receipt_number, amount_paid, expected_period_amount, currency_code, payment_method, payment_reference, payment_date, payment_for_period_start, payment_for_period_end, is_partial, balance_before, balance_after, verified_by_landlord, verified_at, receipt_status, receipt_generated, receipt_path, notes, idempotency_key, status, created_at",
    )
    .maybeSingle<Pick<
      RentPaymentRow,
      | "id"
      | "landlord_id"
      | "tenant_id"
      | "tenancy_id"
      | "receipt_number"
      | "amount_paid"
      | "receipt_path"
      | "receipt_status"
      | "status"
    >>();

  if (error) {
    throw error;
  }

  if (data) {
    return getRentPaymentById(params.supabase, params.paymentId);
  }

  return getRentPaymentById(params.supabase, params.paymentId);
}

export async function generateCanonicalRentReceipt(params: {
  supabase: SupabaseClient;
  payment: RentPaymentRow;
}): Promise<RentReceiptGenerationResult> {
  assertReceiptMatchesPayment(params.payment);

  if (params.payment.receipt_path) {
    const receiptDownloadUrl = await createSignedRentReceiptPdfUrl(
      params.payment.receipt_path,
    );

    return {
      payment: params.payment,
      receiptDownloadUrl,
      wasReplay: true,
    };
  }

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

  const updatedPayment = await persistRentPaymentReceipt({
    supabase: params.supabase,
    paymentId: params.payment.id,
    receiptPath,
    receiptNumber,
  });

  const didPersistReceipt = updatedPayment.receipt_path === receiptPath;

  if (didPersistReceipt) {
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
        payment_method: updatedPayment.payment_method,
      },
    });
  }

  const receiptDownloadUrl = updatedPayment.receipt_path
    ? await createSignedRentReceiptPdfUrl(updatedPayment.receipt_path)
    : null;

  return {
    payment: updatedPayment,
    receiptDownloadUrl,
    wasReplay: !didPersistReceipt,
  };
}
