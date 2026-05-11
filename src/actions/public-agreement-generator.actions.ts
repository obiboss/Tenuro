"use server";

import type { PublicAgreementGeneratorActionState } from "@/actions/public-agreement-generator.state";
import { generatePublicTenancyAgreement } from "@/server/services/public-agreement-generator.service";
import { publicAgreementGeneratorSchema } from "@/server/validators/public-agreement-generator.schema";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not generate this agreement. Please check the details and try again.";
}

export async function generatePublicAgreementAction(
  _previousState: PublicAgreementGeneratorActionState,
  formData: FormData,
): Promise<PublicAgreementGeneratorActionState> {
  try {
    const parsed = publicAgreementGeneratorSchema.safeParse({
      landlordFullName: getFormString(formData, "landlordFullName"),
      landlordPhoneNumber: getFormString(formData, "landlordPhoneNumber"),
      landlordEmail: getFormString(formData, "landlordEmail"),
      tenantFullName: getFormString(formData, "tenantFullName"),
      tenantPhoneNumber: getFormString(formData, "tenantPhoneNumber"),
      tenantEmail: getFormString(formData, "tenantEmail"),
      propertyName: getFormString(formData, "propertyName"),
      propertyAddress: getFormString(formData, "propertyAddress"),
      unitIdentifier: getFormString(formData, "unitIdentifier"),
      cityState: getFormString(formData, "cityState"),
      propertyUse: getFormString(formData, "propertyUse"),
      rentAmount: getFormString(formData, "rentAmount"),
      cautionDepositAmount: getFormString(formData, "cautionDepositAmount"),
      agreementStartDate: getFormString(formData, "agreementStartDate"),
      agreementDuration: getFormString(formData, "agreementDuration"),
      paymentFrequency: getFormString(formData, "paymentFrequency"),
      renewalNoticeDays: getFormString(formData, "renewalNoticeDays"),
      additionalTerms: getFormString(formData, "additionalTerms"),
      sourcePath: getFormString(formData, "sourcePath"),
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const agreement = await generatePublicTenancyAgreement(parsed.data);

    return {
      ok: true,
      message: "Your agreement preview is ready.",
      agreement,
    };
  } catch (error) {
    console.error("generatePublicAgreementAction failed:", error);

    return {
      ok: false,
      message: getActionErrorMessage(error),
    };
  }
}
