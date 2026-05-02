"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { initializeManualRentAppFeePayment } from "@/server/services/app-fee-payment.service";
import { initializeAppFeePaymentSchema } from "@/server/validators/payment.schema";

export type AppFeePaymentActionState = {
  ok: boolean;
  message: string;
  authorizationUrl?: string;
  reference?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function initializeManualRentAppFeePaymentAction(
  _previousState: AppFeePaymentActionState,
  formData: FormData,
): Promise<AppFeePaymentActionState> {
  try {
    const parsed = initializeAppFeePaymentSchema.parse({
      rentPaymentId: formData.get("rentPaymentId"),
      idempotencyKey: formData.get("idempotencyKey"),
    });

    const result = await initializeManualRentAppFeePayment(parsed);

    revalidatePath("/payments");

    return {
      ok: true,
      message: "Tenuro app fee checkout prepared.",
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
    };
  } catch (error) {
    console.error("initializeManualRentAppFeePaymentAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
