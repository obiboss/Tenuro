"use server";

import { revalidatePath } from "next/cache";
import type { ExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { errorResult } from "@/server/errors/result";
import {
  approveExistingTenantClaimForCurrentLandlord,
  createExistingTenantClaimForCurrentLandlord,
  rejectExistingTenantClaimForCurrentLandlord,
  submitExistingTenantClaimByToken,
  updateExistingTenantClaimArrearsForCurrentLandlord,
} from "@/server/services/existing-tenant-claims.service";
import {
  approveExistingTenantClaimSchema,
  createExistingTenantClaimSchema,
  rejectExistingTenantClaimSchema,
  submitExistingTenantClaimSchema,
  updateExistingTenantClaimArrearsSchema,
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
      message: "Opening WhatsApp with the existing tenant link.",
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
      occupation: formData.get("occupation"),
      idType: formData.get("idType"),
      idNumber: formData.get("idNumber"),
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

export async function updateExistingTenantClaimArrearsAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = updateExistingTenantClaimArrearsSchema.parse({
      claimId: formData.get("claimId"),
      lastPaymentAmount: formData.get("lastPaymentAmount"),
      lastPaymentDate: formData.get("lastPaymentDate"),
    });

    await updateExistingTenantClaimArrearsForCurrentLandlord(parsed);

    revalidatePath("/existing-tenant-claims");

    return {
      ok: true,
      message: "Arrears estimate updated.",
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

export async function approveExistingTenantClaimAction(
  _previousState: ExistingTenantClaimActionState,
  formData: FormData,
): Promise<ExistingTenantClaimActionState> {
  try {
    const parsed = approveExistingTenantClaimSchema.parse({
      claimId: formData.get("claimId"),
      confirmedRentAmount: formData.get("confirmedRentAmount"),
      confirmedMoveInDate: formData.get("confirmedMoveInDate"),
      confirmedCurrentDueDate: formData.get("confirmedCurrentDueDate"),
      openingBalance: formData.get("openingBalance"),
      reviewNotes: formData.get("reviewNotes"),
    });

    await approveExistingTenantClaimForCurrentLandlord(parsed);

    revalidatePath("/existing-tenant-claims");
    revalidatePath("/tenants");
    revalidatePath("/tenancies");
    revalidatePath("/renewals");
    revalidatePath("/notifications");
    revalidatePath("/overview");

    return {
      ok: true,
      message: "Existing tenant approved and tenancy created.",
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
