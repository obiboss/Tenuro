"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult, successResult } from "@/server/errors/result";
import {
  approveTenantSchema,
  createTenantShellSchema,
  rejectTenantSchema,
  updateTenantSchema,
} from "@/server/validators/tenant.schema";
import {
  approveTenantForCurrentLandlord,
  archiveTenantForCurrentLandlord,
  createTenantShellForCurrentLandlord,
  rejectTenantForCurrentLandlord,
  updateTenantForCurrentLandlord,
} from "@/server/services/tenants.service";

export type TenantActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTenantShellAction(
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  let createdTenantId: string | null = null;

  try {
    const parsed = createTenantShellSchema.parse({
      unitId: formData.get("unitId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      landlordNotes: formData.get("landlordNotes"),
    });

    const tenant = await createTenantShellForCurrentLandlord(parsed);
    createdTenantId = tenant.id;

    revalidatePath("/tenants");
    revalidatePath("/properties");
  } catch (error) {
    console.error("createTenantShellAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  if (createdTenantId) {
    redirect(`/tenants/${createdTenantId}`);
  }

  return {
    ok: true,
    message: "Tenant saved.",
  };
}

export async function updateTenantAction(
  tenantId: string,
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const parsed = updateTenantSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      homeAddress: formData.get("homeAddress"),
      occupation: formData.get("occupation"),
      employer: formData.get("employer"),
      landlordNotes: formData.get("landlordNotes"),
    });

    await updateTenantForCurrentLandlord(tenantId, parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenantId}`);

    return successResult("Tenant profile saved.");
  } catch (error) {
    console.error("updateTenantAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function approveTenantAction(
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const parsed = approveTenantSchema.parse({
      tenantId: formData.get("tenantId"),
    });

    await approveTenantForCurrentLandlord(parsed.tenantId);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${parsed.tenantId}`);

    return successResult(
      "Tenant approved. You can now prepare the tenancy record and agreement.",
    );
  } catch (error) {
    console.error("approveTenantAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function rejectTenantAction(
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const parsed = rejectTenantSchema.parse({
      tenantId: formData.get("tenantId"),
      reason: formData.get("reason"),
    });

    await rejectTenantForCurrentLandlord(parsed.tenantId, {
      tenantId: parsed.tenantId,
      reason: parsed.reason,
    });

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${parsed.tenantId}`);

    return successResult("Tenant rejected.");
  } catch (error) {
    console.error("rejectTenantAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function archiveTenantAction(tenantId: string) {
  await archiveTenantForCurrentLandlord(tenantId);

  revalidatePath("/tenants");
  redirect("/tenants");
}
