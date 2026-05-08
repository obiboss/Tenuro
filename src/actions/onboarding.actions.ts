"use server";

import { revalidatePath } from "next/cache";
import {
  type OnboardingInviteActionState,
  type TenantOnboardingActionState,
} from "@/actions/onboarding.state";
import { errorResult } from "@/server/errors/result";
import {
  generateTenantOnboardingLink,
  submitTenantOnboarding,
} from "@/server/services/onboarding.service";
import { submitTenantOnboardingSchema } from "@/server/validators/onboarding.schema";
import { z } from "zod";

const tenantIdSchema = z.string().uuid();

export async function generateTenantOnboardingLinkAction(
  _previousState: OnboardingInviteActionState,
  formData: FormData,
): Promise<OnboardingInviteActionState> {
  try {
    const tenantId = tenantIdSchema.parse(formData.get("tenantId"));

    const result = await generateTenantOnboardingLink(tenantId);

    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath("/tenants");

    return {
      ok: true,
      message: "Opening WhatsApp with the tenant onboarding message.",
      onboardingUrl: result.onboardingUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
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

export async function submitTenantOnboardingAction(
  _previousState: TenantOnboardingActionState,
  formData: FormData,
): Promise<TenantOnboardingActionState> {
  try {
    const parsed = submitTenantOnboardingSchema.parse({
      token: formData.get("token"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      dateOfBirth: formData.get("dateOfBirth"),
      occupation: formData.get("occupation"),
      employer: formData.get("employer"),
      homeAddress: formData.get("homeAddress"),
      idType: formData.get("idType"),
      idNumber: formData.get("idNumber"),
      idDocumentPath: formData.get("idDocumentPath"),
      passportPhotoPath: formData.get("passportPhotoPath"),
      hasPets: formData.get("hasPets") || undefined,
      occupantCount: formData.get("occupantCount") || undefined,
      propertyUse: formData.get("propertyUse") || undefined,
      hasChildrenUnderFive: formData.get("hasChildrenUnderFive") || undefined,
      monthlyIncomeRange: formData.get("monthlyIncomeRange") || undefined,
      canProvideGuarantor: formData.get("canProvideGuarantor") || undefined,
      willUseShortlet: formData.get("willUseShortlet") || undefined,
      willSublet: formData.get("willSublet") || undefined,
      willRunCustomerFacingBusiness:
        formData.get("willRunCustomerFacingBusiness") || undefined,
      willUseHeavyGeneratorOrEquipment:
        formData.get("willUseHeavyGeneratorOrEquipment") || undefined,
      willHostLargeGatherings:
        formData.get("willHostLargeGatherings") || undefined,
    });

    const tenant = await submitTenantOnboarding(parsed);

    revalidatePath(`/t/onboarding/${parsed.token}`);
    revalidatePath(`/onboarding/${parsed.token}`);
    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenant.id}`);

    return {
      ok: true,
      message:
        "Your tenant profile has been submitted successfully. The landlord will review it and contact you with the next step.",
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
