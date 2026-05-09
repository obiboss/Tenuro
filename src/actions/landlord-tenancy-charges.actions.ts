"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  archiveLandlordChargeForCurrentLandlord,
  createLandlordChargeForCurrentLandlord,
  updateLandlordChargeForCurrentLandlord,
} from "@/server/services/landlord-tenancy-charges.service";
import {
  archiveLandlordTenancyChargeSchema,
  createLandlordTenancyChargeSchema,
  updateLandlordTenancyChargeSchema,
} from "@/server/validators/landlord-tenancy-charges.schema";

export type LandlordTenancyChargeActionState = {
  ok: boolean;
  message: string;
  chargeId?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialLandlordTenancyChargeActionState: LandlordTenancyChargeActionState =
  {
    ok: false,
    message: "",
  };

function revalidateChargePaths(tenancyId: string) {
  revalidatePath("/payments");
  revalidatePath("/tenants");
  revalidatePath(`/tenancies/${tenancyId}`);
}

export async function createLandlordTenancyChargeAction(
  _previousState: LandlordTenancyChargeActionState,
  formData: FormData,
): Promise<LandlordTenancyChargeActionState> {
  try {
    const parsed = createLandlordTenancyChargeSchema.parse({
      tenancyId: formData.get("tenancyId"),
      chargeType: formData.get("chargeType"),
      label: formData.get("label"),
      description: formData.get("description"),
      amount: formData.get("amount"),
      currencyCode: formData.get("currencyCode") || "NGN",
      isRefundable: formData.get("isRefundable") === "on",
      isRequiredBeforeMoveIn: formData.get("isRequiredBeforeMoveIn") !== "off",
    });

    const charge = await createLandlordChargeForCurrentLandlord(parsed);

    revalidateChargePaths(parsed.tenancyId);

    return {
      ok: true,
      message: "Landlord charge added successfully.",
      chargeId: charge.id,
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

export async function updateLandlordTenancyChargeAction(
  _previousState: LandlordTenancyChargeActionState,
  formData: FormData,
): Promise<LandlordTenancyChargeActionState> {
  try {
    const parsed = updateLandlordTenancyChargeSchema.parse({
      chargeId: formData.get("chargeId"),
      tenancyId: formData.get("tenancyId"),
      chargeType: formData.get("chargeType"),
      label: formData.get("label"),
      description: formData.get("description"),
      amount: formData.get("amount"),
      currencyCode: formData.get("currencyCode") || "NGN",
      isRefundable: formData.get("isRefundable") === "on",
      isRequiredBeforeMoveIn: formData.get("isRequiredBeforeMoveIn") !== "off",
    });

    const charge = await updateLandlordChargeForCurrentLandlord(parsed);

    revalidateChargePaths(parsed.tenancyId);

    return {
      ok: true,
      message: "Landlord charge updated successfully.",
      chargeId: charge.id,
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

export async function archiveLandlordTenancyChargeAction(
  _previousState: LandlordTenancyChargeActionState,
  formData: FormData,
): Promise<LandlordTenancyChargeActionState> {
  try {
    const parsed = archiveLandlordTenancyChargeSchema.parse({
      chargeId: formData.get("chargeId"),
      tenancyId: formData.get("tenancyId"),
    });

    const charge = await archiveLandlordChargeForCurrentLandlord(parsed);

    revalidateChargePaths(parsed.tenancyId);

    return {
      ok: true,
      message: "Landlord charge removed successfully.",
      chargeId: charge.id,
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
