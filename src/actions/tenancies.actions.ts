"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  createTenancyForCurrentLandlord,
  terminateTenancyForCurrentLandlord,
} from "@/server/services/tenancies.service";
import {
  createTenancySchema,
  terminateTenancySchema,
} from "@/server/validators/tenancy.schema";

export type TenancyActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTenancyAction(
  _previousState: TenancyActionState,
  formData: FormData,
): Promise<TenancyActionState> {
  try {
    const parsed = createTenancySchema.parse({
      tenantId: formData.get("tenantId"),
      unitId: formData.get("unitId"),
      rentAmount: formData.get("rentAmount"),
      paymentFrequency: formData.get("paymentFrequency"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      renewalNoticeDate: formData.get("renewalNoticeDate") || undefined,
      openingBalance: formData.get("openingBalance") || 0,
      openingBalanceNote: formData.get("openingBalanceNote"),
      agreementNotes: formData.get("agreementNotes"),
      currencyCode: "NGN",
    });

    await createTenancyForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${parsed.tenantId}`);
    revalidatePath("/overview");

    return successResult("Rental agreement created.");
  } catch (error) {
    console.error("createTenancyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message:
        result.message === "Something went wrong. Please try again."
          ? error instanceof Error
            ? error.message
            : result.message
          : result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function terminateTenancyAction(
  _previousState: TenancyActionState,
  formData: FormData,
): Promise<TenancyActionState> {
  try {
    const parsed = terminateTenancySchema.parse({
      tenancyId: formData.get("tenancyId"),
      reason: formData.get("reason"),
    });

    await terminateTenancyForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath("/overview");

    return successResult("Rental agreement ended.");
  } catch (error) {
    console.error("terminateTenancyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message:
        result.message === "Something went wrong. Please try again."
          ? error instanceof Error
            ? error.message
            : result.message
          : result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
