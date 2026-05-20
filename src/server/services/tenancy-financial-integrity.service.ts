import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import { getTenancyBalanceSummary } from "@/server/repositories/ledger.repository";
import type { RentPaymentRow } from "@/server/repositories/payments.repository";
import {
  getPayableOutstandingBalance,
  normalizeTenancyBalanceSummary,
} from "@/server/utils/tenancy-balance";

/** Small tolerance for kobo/rounding drift on Paystack totals. */
export const PAYMENT_AMOUNT_TOLERANCE_NAIRA = 1;

export type PaymentBalanceClassification = {
  outstandingBefore: number;
  payableOutstanding: number;
  isPartial: boolean;
  isOverpayment: boolean;
  isAdvancePayment: boolean;
};

export { normalizeTenancyBalanceSummary, getPayableOutstandingBalance };

export function classifyPaymentAgainstBalance(params: {
  amountPaid: number;
  outstandingBefore: number;
}): PaymentBalanceClassification {
  const amountPaid = Number(params.amountPaid);
  const outstandingBefore = Number(params.outstandingBefore);
  const payableOutstanding = getPayableOutstandingBalance(outstandingBefore);

  return {
    outstandingBefore,
    payableOutstanding,
    isPartial:
      payableOutstanding > 0 &&
      amountPaid + PAYMENT_AMOUNT_TOLERANCE_NAIRA < payableOutstanding,
    isOverpayment:
      payableOutstanding > 0 &&
      amountPaid > payableOutstanding + PAYMENT_AMOUNT_TOLERANCE_NAIRA,
    isAdvancePayment: payableOutstanding <= 0 && amountPaid > 0,
  };
}

export async function getCanonicalTenancyBalance(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const balance = await getTenancyBalanceSummary(supabase, tenancyId);
  return normalizeTenancyBalanceSummary(balance, tenancyId);
}

export function assertPositivePaymentAmount(amountPaid: number) {
  const amount = Number(amountPaid);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      "PAYMENT_AMOUNT_INVALID",
      "Payment amount must be greater than zero.",
      400,
    );
  }
}

export function assertManualRentPaymentAmount(params: {
  amountPaid: number;
  outstandingBefore: number;
}) {
  assertPositivePaymentAmount(params.amountPaid);

  const classification = classifyPaymentAgainstBalance({
    amountPaid: params.amountPaid,
    outstandingBefore: params.outstandingBefore,
  });

  if (classification.isOverpayment) {
    throw new AppError(
      "PAYMENT_EXCEEDS_OUTSTANDING",
      `Payment cannot exceed the outstanding balance of ${classification.payableOutstanding.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })}. Record a partial payment or adjust the amount.`,
      400,
    );
  }

  return classification;
}

export function assertGatewayRentPaymentAmount(params: {
  rentAmount: number;
  outstandingBefore: number;
}) {
  assertPositivePaymentAmount(params.rentAmount);

  const classification = classifyPaymentAgainstBalance({
    amountPaid: params.rentAmount,
    outstandingBefore: params.outstandingBefore,
  });

  if (
    classification.payableOutstanding > 0 &&
    params.rentAmount >
      classification.payableOutstanding + PAYMENT_AMOUNT_TOLERANCE_NAIRA
  ) {
    throw new AppError(
      "GATEWAY_RENT_AMOUNT_EXCEEDS_OUTSTANDING",
      "Online rent payment amount exceeds the current outstanding balance.",
      400,
    );
  }

  return classification;
}

export function assertReceiptMatchesPayment(payment: RentPaymentRow) {
  if (payment.status !== "posted") {
    throw new AppError(
      "PAYMENT_NOT_POSTED",
      "Receipt can only be generated for a posted payment.",
      400,
    );
  }

  const amountPaid = Number(payment.amount_paid);

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    throw new AppError(
      "RECEIPT_AMOUNT_INVALID",
      "Receipt cannot be generated because the payment amount is invalid.",
      400,
    );
  }
}

export function buildPaymentBalanceAuditMetadata(
  classification: PaymentBalanceClassification,
) {
  return {
    outstanding_before: classification.outstandingBefore,
    payable_outstanding: classification.payableOutstanding,
    is_partial_payment: classification.isPartial,
    is_overpayment: classification.isOverpayment,
    is_advance_payment: classification.isAdvancePayment,
  };
}
