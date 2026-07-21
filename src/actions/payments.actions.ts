"use server";

import { revalidatePath } from "next/cache";
import { isAppError } from "@/server/errors/app-error";
import { errorResult } from "@/server/errors/result";
import type { LandlordPaymentGateUiState } from "@/lib/landlord-payment-gate";
import {
  initializeRentPayment,
  initializeTenantDashboardRentPayment,
} from "@/server/services/gateway-payment.service";
import { getCurrentLandlordBankSetup, setupLandlordBankAccount } from "@/server/services/landlord-bank.service";
import { recordManualPaymentForCurrentLandlord } from "@/server/services/payments.service";
import { generateRentReceiptForCurrentLandlord } from "@/server/services/receipts.service";
import { getLandlordPaymentGateUiState } from "@/server/services/paystack-verification.service";
import {
  initializeRentPaymentSchema,
  recordManualPaymentSchema,
  setupLandlordBankAccountSchema,
} from "@/server/validators/payment.schema";

const LANDLORD_PAYOUT_VERIFICATION_ERROR_CODES = new Set([
  "BANK_ACCOUNT_REQUIRED",
  "PAYOUT_ACCOUNT_PENDING_VERIFICATION",
  "PAYOUT_ACCOUNT_VERIFICATION_FAILED",
]);

export type PaymentActionState = {
  ok: boolean;
  message: string;
  paymentGate?: LandlordPaymentGateUiState | null;
  paymentId?: string;
  authorizationUrl?: string;
  tenantPaymentUrl?: string;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  receiptDownloadUrl?: string | null;
  reference?: string;
  expiresAt?: string | null;
  fieldErrors?: Record<string, string[]>;
  offlineSaved?: boolean;
  submissionId?: string;
};

export async function setupLandlordBankAccountAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const parsed = setupLandlordBankAccountSchema.parse({
      bankCode: formData.get("bankCode"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
      businessName: formData.get("businessName"),
    });

    await setupLandlordBankAccount(parsed);

    revalidatePath("/settings");

    return {
      ok: true,
      message: "Bank account connected successfully.",
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function initializeRentPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const parsed = initializeRentPaymentSchema.parse({
      tenancyId: formData.get("tenancyId"),
      amount: formData.get("amount"),
      periodStart: formData.get("periodStart") || undefined,
      periodEnd: formData.get("periodEnd") || undefined,
      idempotencyKey: formData.get("idempotencyKey"),
    });

    const result = await initializeRentPayment(parsed);

    revalidatePath("/payments");
    revalidatePath("/overview");
    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.tenantId}`);

    return {
      ok: true,
      message: "Tenant payment link prepared for WhatsApp.",
      authorizationUrl: result.authorizationUrl,
      tenantPaymentUrl: result.tenantPaymentUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
      reference: result.reference,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    const result = errorResult(error);

    if (
      isAppError(error) &&
      LANDLORD_PAYOUT_VERIFICATION_ERROR_CODES.has(error.code)
    ) {
      const payoutAccount = await getCurrentLandlordBankSetup();

      return {
        ok: false,
        message: result.message,
        paymentGate: getLandlordPaymentGateUiState(payoutAccount),
        fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      };
    }

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function initializeTenantDashboardRentPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

    const result = await initializeTenantDashboardRentPayment({
      idempotencyKey,
    });

    revalidatePath("/tenant");

    return {
      ok: true,
      message: "Rent payment checkout prepared.",
      authorizationUrl: result.authorizationUrl,
      tenantPaymentUrl: result.tenantPaymentUrl,
      reference: result.reference,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function recordManualPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const parsed = recordManualPaymentSchema.parse({
      tenancyId: formData.get("tenancyId"),
      amountPaid: formData.get("amountPaid"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference"),
      paymentDate: formData.get("paymentDate"),
      paymentForPeriodStart: formData.get("paymentForPeriodStart") || undefined,
      paymentForPeriodEnd: formData.get("paymentForPeriodEnd") || undefined,
      notes: formData.get("notes"),
      idempotencyKey: formData.get("idempotencyKey"),
    });

    const result = await recordManualPaymentForCurrentLandlord(parsed);

    revalidatePath("/payments");
    revalidatePath("/overview");
    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.tenantId}`);

    try {
      const receipt = await generateRentReceiptForCurrentLandlord(
        result.paymentId,
      );

      return {
        ok: true,
        message: "Payment recorded successfully. Receipt prepared.",
        paymentId: result.paymentId,
        receiptDownloadUrl: receipt.receiptDownloadUrl,
      };
    } catch (receiptError) {
      console.error("Manual payment receipt generation failed:", receiptError);

      return {
        ok: true,
        message:
          "Payment recorded successfully. Receipt can be generated from payment history.",
        paymentId: result.paymentId,
      };
    }
  } catch (error) {
    console.error("recordManualPaymentAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
