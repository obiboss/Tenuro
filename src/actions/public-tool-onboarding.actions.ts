"use server";

import { redirect } from "next/navigation";
import type {
  PublicAgreementSignupActionState,
  PublicReceiptSignupActionState,
} from "@/actions/public-tool-onboarding.state";
import {
  createLandlordAccountFromPublicAgreement,
  createLandlordAccountFromPublicReceipt,
} from "@/server/services/public-tool-onboarding.service";
import { publicAgreementSignupSchema } from "@/server/validators/public-agreement-generator.schema";
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

export async function createPublicAgreementLandlordAccountAction(
  _previousState: PublicAgreementSignupActionState,
  formData: FormData,
): Promise<PublicAgreementSignupActionState> {
  let shouldRedirect = false;

  try {
    const parsed = publicAgreementSignupSchema.safeParse({
      agreementId: getFormString(formData, "agreementId"),
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

    await createLandlordAccountFromPublicAgreement(parsed.data);
    shouldRedirect = true;
  } catch (error) {
    console.error("createPublicAgreementLandlordAccountAction failed:", error);

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
