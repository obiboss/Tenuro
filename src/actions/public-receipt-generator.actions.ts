"use server";

import { generatePublicRentReceipt } from "@/server/services/public-receipt-generator.service";
import { publicReceiptGeneratorSchema } from "@/server/validators/public-receipt-generator.schema";
import type { PublicReceiptGeneratorActionState } from "@/actions/public-receipt-generator.state";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not generate this receipt. Please check the details and try again.";
}

export async function generatePublicReceiptAction(
  _previousState: PublicReceiptGeneratorActionState,
  formData: FormData,
): Promise<PublicReceiptGeneratorActionState> {
  try {
    const parsed = publicReceiptGeneratorSchema.safeParse({
      landlordFullName: getFormString(formData, "landlordFullName"),
      landlordPhoneNumber: getFormString(formData, "landlordPhoneNumber"),
      landlordEmail: getFormString(formData, "landlordEmail"),
      tenantFullName: getFormString(formData, "tenantFullName"),
      tenantPhoneNumber: getFormString(formData, "tenantPhoneNumber"),
      propertyAddress: getFormString(formData, "propertyAddress"),
      propertyName: getFormString(formData, "propertyName"),
      unitIdentifier: getFormString(formData, "unitIdentifier"),
      cityState: getFormString(formData, "cityState"),
      rentAmount: getFormString(formData, "rentAmount"),
      paymentDate: getFormString(formData, "paymentDate"),
      rentStartDate: getFormString(formData, "rentStartDate"),
      paymentMethod: getFormString(formData, "paymentMethod"),
      rentDuration: getFormString(formData, "rentDuration"),
      sourcePath: getFormString(formData, "sourcePath"),
      sourceLocation: getFormString(formData, "sourceLocation"),
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const receipt = await generatePublicRentReceipt(parsed.data);

    return {
      ok: true,
      message: "Your receipt is ready.",
      receipt,
    };
  } catch (error) {
    console.error("generatePublicReceiptAction failed:", error);

    return {
      ok: false,
      message: getActionErrorMessage(error),
    };
  }
}
