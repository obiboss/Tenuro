"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import { saveManagerPropertyServiceCharges } from "@/server/services/manager-property-settings.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { saveManagerPropertyServiceChargesSchema } from "@/server/validators/manager-property-settings.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors:
      "fieldErrors" in result
        ? result.fieldErrors
        : undefined,
  };
}

function parseCharges(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;

  return Array.isArray(parsed) ? parsed : [];
}

export async function saveManagerPropertyServiceChargesAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = saveManagerPropertyServiceChargesSchema.parse({
      propertyId: formData.get("propertyId"),
      landlordClientId: formData.get("landlordClientId"),
      charges: parseCharges(formData.get("chargesJson")),
    });

    await saveManagerPropertyServiceCharges(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath(`/manager/properties/${parsed.propertyId}`);
    revalidatePath(
      `/manager/properties/${parsed.propertyId}/settings`,
    );
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Property charges saved.",
      propertyId: parsed.propertyId,
      landlordClientId: parsed.landlordClientId,
      submissionId: `${Date.now()}`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
