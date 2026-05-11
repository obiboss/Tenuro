"use server";

import { redirect } from "next/navigation";
import type { PublicReceiptSignupActionState } from "@/actions/public-tool-onboarding.state";
import { createLandlordAccountFromPublicReceipt } from "@/server/services/public-tool-onboarding.service";
import { publicReceiptSignupSchema } from "@/server/validators/public-receipt-generator.schema";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Account could not be created. Please check the details and try again.";
}

export async function createPublicReceiptLandlordAccountAction(
  _previousState: PublicReceiptSignupActionState,
  formData: FormData,
): Promise<PublicReceiptSignupActionState> {
  let shouldRedirect = false;

  try {
    const parsed = publicReceiptSignupSchema.safeParse({
      receiptId: getFormString(formData, "receiptId"),
      token: getFormString(formData, "token"),
      fullName: getFormString(formData, "fullName"),
      phoneNumber: getFormString(formData, "phoneNumber"),
      email: getFormString(formData, "email"),
      password: getFormString(formData, "password"),
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await createLandlordAccountFromPublicReceipt(parsed.data);
    shouldRedirect = true;
  } catch (error) {
    console.error("createPublicReceiptLandlordAccountAction failed:", error);

    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }

  if (shouldRedirect) {
    redirect("/overview");
  }

  return {
    ok: true,
    message: "Account created successfully.",
  };
}
