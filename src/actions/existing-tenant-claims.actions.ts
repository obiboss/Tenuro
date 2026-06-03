"use server";

import { revalidatePath } from "next/cache";
import type { ExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { errorResult } from "@/server/errors/result";
import {
  createExistingTenantClaimForCurrentLandlord,
  rejectExistingTenantClaimForCurrentLandlord,
} from "@/server/services/existing-tenant-claims.service";
import {
  createExistingTenantClaimSchema,
  rejectExistingTenantClaimSchema,
} from "@/server/validators/existing-tenant-claim.schema";

export async function createExistingTenantClaimAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = createExistingTenantClaimSchema.parse({
      unitId: formData.get("unitId"),
      note: formData.get("note"),
    });

    const result = await createExistingTenantClaimForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath("/tenants/existing/new");
    revalidatePath("/existing-tenant-claims");

    return {
      ok: true,
      message: "Existing tenant claim link prepared.",
      claimId: result.claim.id,
      claimUrl: result.claimUrl,
      whatsappMessage: result.whatsappMessage,
      expiresAt: result.expiresAt,
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

export async function rejectExistingTenantClaimAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = rejectExistingTenantClaimSchema.parse({
      claimId: formData.get("claimId"),
      reason: formData.get("reason"),
    });

    await rejectExistingTenantClaimForCurrentLandlord(parsed);

    revalidatePath("/existing-tenant-claims");

    return {
      ok: true,
      message: "Existing tenant claim rejected.",
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
