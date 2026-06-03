"use server";

import { revalidatePath } from "next/cache";
import type { ExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { errorResult } from "@/server/errors/result";
import {
  createExistingTenantClaimForCurrentLandlord,
  rejectExistingTenantClaimForCurrentLandlord,
  submitExistingTenantClaimByToken,
} from "@/server/services/existing-tenant-claims.service";
import {
  createExistingTenantClaimSchema,
  rejectExistingTenantClaimSchema,
  submitExistingTenantClaimSchema,
} from "@/server/validators/existing-tenant-claim.schema";

export async function createExistingTenantClaimAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = createExistingTenantClaimSchema.parse({
      unitId: formData.get("unitId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
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
      tenantWhatsappNumber: result.tenantWhatsappNumber,
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

export async function submitExistingTenantClaimAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = submitExistingTenantClaimSchema.parse({
      token: formData.get("token"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      moveInDate: formData.get("moveInDate"),
      claimedRentAmount: formData.get("claimedRentAmount"),
      claimedNextRentDueDate: formData.get("claimedNextRentDueDate"),
      paymentFrequency: formData.get("paymentFrequency"),
      tenantNotes: formData.get("tenantNotes"),
    });

    await submitExistingTenantClaimByToken(parsed);

    revalidatePath(`/existing-tenant-claims/${parsed.token}`);
    revalidatePath("/existing-tenant-claims");
    revalidatePath("/tenants");

    return {
      ok: true,
      message: "Your tenancy details have been submitted for landlord review.",
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
