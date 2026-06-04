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

function parseRentCyclesJson(formData: FormData) {
  const raw = formData.get("rentCyclesJson");

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Rent history data is missing.");
  }

  return JSON.parse(raw) as unknown;
}

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
      statedRentDueDate: formData.get("statedRentDueDate"),
      claimedRentAmount: formData.get("claimedRentAmount"),
      paymentFrequency: formData.get("paymentFrequency"),
      tenantNotes: formData.get("tenantNotes"),
    });

    await submitExistingTenantClaimByToken(parsed);

    revalidatePath(`/claim/${parsed.token}`);
    revalidatePath("/existing-tenant-claims");
    revalidatePath("/tenants");
    revalidatePath("/notifications");

    return {
      ok: true,
      message:
        "Your details have been submitted. Your landlord will review and confirm your tenancy shortly.",
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
      cycles: parseRentCyclesJson(formData),
    });

    await updateExistingTenantClaimArrearsForCurrentLandlord(parsed);

    revalidatePath("/existing-tenant-claims");
    revalidatePath(`/existing-tenant-claims/${parsed.claimId}`);

    return {
      ok: true,
      message: "Rent history saved.",
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

    const result = await approveExistingTenantClaimForCurrentLandlord(parsed);

    revalidatePath("/existing-tenant-claims");
    revalidatePath(`/existing-tenant-claims/${parsed.claimId}`);
    revalidatePath(`/tenants/${result.tenantId}`);
    revalidatePath("/tenants");
    revalidatePath("/tenancies");
    revalidatePath("/renewals");
    revalidatePath("/notifications");
    revalidatePath("/overview");

    return {
      ok: true,
      message: `${result.tenantName}'s tenancy has been created.`,
      tenantId: result.tenantId,
      tenancyId: result.tenancyId,
      tenantName: result.tenantName,
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
    revalidatePath(`/existing-tenant-claims/${parsed.claimId}`);

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
