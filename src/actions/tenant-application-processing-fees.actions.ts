"use server";

import { z } from "zod";
import type { TenantApplicationProcessingFeeActionState } from "@/actions/tenant-application-processing-fees.state";
import { errorResult } from "@/server/errors/result";
import { initializeTenantApplicationProcessingFee } from "@/server/services/tenant-application-processing-fees.service";

const propertyApplicationIdSchema = z.string().uuid();

export async function initializeTenantApplicationProcessingFeeAction(
  _previousState: TenantApplicationProcessingFeeActionState,
  formData: FormData,
): Promise<TenantApplicationProcessingFeeActionState> {
  try {
    const propertyApplicationId = propertyApplicationIdSchema.parse(
      formData.get("propertyApplicationId"),
    );

    const result = await initializeTenantApplicationProcessingFee(
      propertyApplicationId,
    );

    return {
      ok: true,
      message: "Opening secure Paystack payment page.",
      authorizationUrl: result.authorizationUrl,
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
