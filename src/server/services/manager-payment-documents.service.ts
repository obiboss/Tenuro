import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getManagerPaystackPaymentRequestByReference } from "@/server/repositories/manager-paystack.repository";
import { getManagerTenantAgreementById } from "@/server/repositories/manager-tenant-onboarding.repository";
import { getManagerRentReceiptDownloadForPayment } from "@/server/services/manager-receipts.service";
import { getManagerTenancyAgreementPdfDownload } from "@/server/services/manager-tenancy-agreement-pdf.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

async function getPaidManagerPaymentRequest(reference: string) {
  const supabase = createSupabaseAdminClient();
  const paymentRequest = await getManagerPaystackPaymentRequestByReference(
    supabase,
    reference,
  );

  if (
    !paymentRequest ||
    paymentRequest.status !== "paid" ||
    !paymentRequest.processed_payment_id
  ) {
    throw new AppError(
      "MANAGER_PAYMENT_DOCUMENT_NOT_READY",
      "Payment documents are available after payment is confirmed.",
      404,
    );
  }

  return {
    supabase,
    paymentRequest,
    processedPaymentId: paymentRequest.processed_payment_id,
  };
}

export async function getManagerReceiptDownloadByPaymentReference(
  reference: string,
) {
  const { paymentRequest, processedPaymentId } =
    await getPaidManagerPaymentRequest(reference);

  return getManagerRentReceiptDownloadForPayment({
    organizationId: paymentRequest.organization_id,
    rentPaymentId: processedPaymentId,
    generatedByProfileId: paymentRequest.created_by_profile_id,
  });
}

export async function getManagerAgreementDownloadByPaymentReference(
  reference: string,
) {
  const { supabase, paymentRequest } =
    await getPaidManagerPaymentRequest(reference);

  if (!paymentRequest.agreement_document_id) {
    throw new AppError(
      "MANAGER_PAYMENT_AGREEMENT_MISSING",
      "Agreement document is not available for this payment.",
      404,
    );
  }

  const agreement = await getManagerTenantAgreementById(supabase, {
    organizationId: paymentRequest.organization_id,
    agreementId: paymentRequest.agreement_document_id,
  });

  if (!agreement) {
    throw new AppError(
      "MANAGER_PAYMENT_AGREEMENT_NOT_FOUND",
      "Agreement document is not available for this payment.",
      404,
    );
  }

  return getManagerTenancyAgreementPdfDownload({
    supabase,
    agreement,
  });
}
