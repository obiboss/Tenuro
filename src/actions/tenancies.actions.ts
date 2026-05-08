"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  createTenancyForCurrentLandlord,
  renewTenancyForCurrentLandlord,
  terminateTenancyForCurrentLandlord,
} from "@/server/services/tenancies.service";
import {
  createTenancySchema,
  renewTenancySchema,
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
    revalidatePath("/renewals");

    return successResult(
      "Tenancy record created. You can now generate and send the tenancy agreement.",
    );
  } catch (error) {
    console.error("createTenancyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function renewTenancyAction(
  _previousState: TenancyActionState,
  formData: FormData,
): Promise<TenancyActionState> {
  try {
    const parsed = renewTenancySchema.parse({
      tenancyId: formData.get("tenancyId"),
    });

    const result = await renewTenancyForCurrentLandlord(parsed);

    revalidatePath("/renewals");
    revalidatePath("/overview");
    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.tenantId}`);

    return successResult("Tenancy renewed and new rent charge posted.");
  } catch (error) {
    console.error("renewTenancyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
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
    revalidatePath("/renewals");

    return successResult("Rental agreement ended.");
  } catch (error) {
    console.error("terminateTenancyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
