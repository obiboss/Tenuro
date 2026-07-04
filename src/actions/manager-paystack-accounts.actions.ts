"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import {
  saveManagerLandlordPaystackAccount,
  saveManagerOrganizationPaystackAccount,
} from "@/server/services/manager-paystack-accounts.service";
import {
  saveManagerLandlordPaystackAccountSchema,
  saveManagerOrganizationPaystackAccountSchema,
} from "@/server/validators/manager-paystack-accounts.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function saveManagerOrganizationPaystackAccountAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    const parsed = saveManagerOrganizationPaystackAccountSchema.parse({
      businessName: formData.get("businessName"),
      contactName: formData.get("contactName"),
      contactPhone: formData.get("contactPhone"),
      contactEmail: formData.get("contactEmail"),
      bankCode: formData.get("bankCode"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
    });

    await saveManagerOrganizationPaystackAccount(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/payouts");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Manager payout account saved successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveManagerLandlordPaystackAccountAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    const parsed = saveManagerLandlordPaystackAccountSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      businessName: formData.get("businessName"),
      contactName: formData.get("contactName"),
      contactPhone: formData.get("contactPhone"),
      contactEmail: formData.get("contactEmail"),
      bankCode: formData.get("bankCode"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
    });

    await saveManagerLandlordPaystackAccount(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/payouts");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Landlord payout account saved successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
