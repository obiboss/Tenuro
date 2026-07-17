"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import { saveManagerPropertyTenantRequirements } from "@/server/services/manager-property-requirements.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { saveManagerPropertyTenantRequirementsSchema } from "@/server/validators/manager-property-requirements.schema";

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

function parseRequirements(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;

  return Array.isArray(parsed) ? parsed : [];
}

export async function saveManagerPropertyTenantRequirementsAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed =
      saveManagerPropertyTenantRequirementsSchema.parse({
        propertyId: formData.get("propertyId"),
        landlordClientId: formData.get("landlordClientId"),
        requirements: parseRequirements(
          formData.get("requirementsJson"),
        ),
      });

    await saveManagerPropertyTenantRequirements(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath(`/manager/properties/${parsed.propertyId}`);
    revalidatePath(
      `/manager/properties/${parsed.propertyId}/settings`,
    );
    revalidatePath("/manager/tenants");

    return {
      ok: true,
      message: "Tenant requirements saved.",
      propertyId: parsed.propertyId,
      landlordClientId: parsed.landlordClientId,
      submissionId: `${Date.now()}`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
