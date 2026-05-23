"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { updatePlatformPaymentSettingsForPlatformAdmin } from "@/server/services/platform-payment-settings.service";
import { updatePlatformPaymentSettingsSchema } from "@/server/validators/platform-payment-settings.schema";

export type PlatformAdminPaymentSettingsActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function revalidatePaymentSettingsSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/payment-settings");
  revalidatePath("/t/onboarding", "layout");
  revalidatePath("/overview");
  revalidatePath("/settings");
}

export async function updatePlatformPaymentSettingsAction(
  _previousState: PlatformAdminPaymentSettingsActionState,
  formData: FormData,
): Promise<PlatformAdminPaymentSettingsActionState> {
  try {
    const parsed = updatePlatformPaymentSettingsSchema.parse({
      agentProcessingFeeAmount: formData.get("agentProcessingFeeAmount"),
      agentProcessingFeeAgentShare: formData.get("agentProcessingFeeAgentShare"),
      agentProcessingFeePlatformShare: formData.get(
        "agentProcessingFeePlatformShare",
      ),
      isAgentProcessingFeeEnabled:
        formData.get("isAgentProcessingFeeEnabled") === "on",
      landlordProcessingFeeAmount: formData.get("landlordProcessingFeeAmount"),
      landlordProcessingFeeLandlordShare: formData.get(
        "landlordProcessingFeeLandlordShare",
      ),
      landlordProcessingFeePlatformShare: formData.get(
        "landlordProcessingFeePlatformShare",
      ),
      isLandlordProcessingFeeEnabled:
        formData.get("isLandlordProcessingFeeEnabled") === "on",
      bopaBasicAnnualPriceNaira: formData.get("bopaBasicAnnualPriceNaira"),
      bopaProAnnualPriceNaira: formData.get("bopaProAnnualPriceNaira"),
      landlordTrialDays: formData.get("landlordTrialDays"),
      expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    });

    await updatePlatformPaymentSettingsForPlatformAdmin(parsed);

    revalidatePaymentSettingsSurfaces();

    return {
      ok: true,
      message: "Platform payment settings saved successfully.",
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
