"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import { createManagerMaintenanceRequest } from "@/server/services/manager-maintenance.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createManagerMaintenanceRequestSchema } from "@/server/validators/manager-maintenance.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createManagerMaintenanceRequestAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("maintenance.manage");

    const parsed = createManagerMaintenanceRequestSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      tenantId: formData.get("tenantId"),
      issueTitle: formData.get("issueTitle"),
      issueDescription: formData.get("issueDescription"),
      priority: formData.get("priority") || "medium",
      status: formData.get("status") || "reported",
      estimatedCost: formData.get("estimatedCost") || "0",
      actualCost: formData.get("actualCost") || "0",
      vendorName: formData.get("vendorName"),
      reportedDate: formData.get("reportedDate"),
      resolvedDate: formData.get("resolvedDate"),
      notes: formData.get("notes"),
    });

    await createManagerMaintenanceRequest(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/maintenance");

    return {
      ok: true,
      message: "Maintenance request recorded successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
