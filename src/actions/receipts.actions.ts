"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  generateRentReceiptForCurrentLandlord,
  prepareRentReceiptWhatsAppForCurrentLandlord,
} from "@/server/services/receipts.service";
import { uuidSchema } from "@/server/validators/common.schema";

export type ReceiptActionState = {
  ok: boolean;
  message: string;
  receiptDownloadUrl?: string | null;
  whatsappUrl?: string | null;
  fieldErrors?: Record<string, string[]>;
};

export async function generateRentReceiptAction(
  _previousState: ReceiptActionState,
  formData: FormData,
): Promise<ReceiptActionState> {
  try {
    const paymentId = uuidSchema.parse(formData.get("paymentId"));

    const result = await generateRentReceiptForCurrentLandlord(paymentId);

    revalidatePath("/payments");
    revalidatePath("/overview");
    revalidatePath("/tenants");

    return {
      ok: true,
      message: "Receipt prepared.",
      receiptDownloadUrl: result.receiptDownloadUrl,
    };
  } catch (error) {
    console.error("generateRentReceiptAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function prepareRentReceiptWhatsAppAction(
  _previousState: ReceiptActionState,
  formData: FormData,
): Promise<ReceiptActionState> {
  try {
    const paymentId = uuidSchema.parse(formData.get("paymentId"));

    const result =
      await prepareRentReceiptWhatsAppForCurrentLandlord(paymentId);

    return {
      ok: true,
      message: "WhatsApp receipt message prepared.",
      whatsappUrl: result.whatsappUrl,
    };
  } catch (error) {
    console.error("prepareRentReceiptWhatsAppAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
