"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { initializeRentPayment } from "@/server/services/gateway-payment.service";
import { setupLandlordBankAccount } from "@/server/services/landlord-bank.service";
import { recordManualPaymentForCurrentLandlord } from "@/server/services/payments.service";
import {
  initializeRentPaymentSchema,
  recordManualPaymentSchema,
  setupLandlordBankAccountSchema,
} from "@/server/validators/payment.schema";
import { generateRentReceiptForCurrentLandlord } from "@/server/services/receipt.service";

export type PaymentActionState = {
  ok: boolean;
  message: string;
  paymentId?: string;
  authorizationUrl?: string;
  tenantPaymentUrl?: string;
  receiptDownloadUrl?: string | null;
  reference?: string;
  fieldErrors?: Record<string, string[]>;
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

    return {
      ok: true,
      message: "Tenant payment link prepared.",
      authorizationUrl: result.authorizationUrl,
      tenantPaymentUrl: result.tenantPaymentUrl,
      reference: result.reference,
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
