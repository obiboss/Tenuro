"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { errorResult } from "@/server/errors/result";
import {
  acceptManagerTenantAgreementAndCreatePayment,
  approveManagerTenantOnboardingRequestForCurrentManager,
  createManagerTenantOnboardingRequestForCurrentManager,
  declineManagerTenantAgreementAndCancel,
  rejectManagerTenantOnboardingRequestForCurrentManager,
  resendManagerFirstRentPaymentLinkForCurrentManager,
  resendManagerTenantOnboardingLinkForCurrentManager,
  submitManagerTenantOnboardingRequestByToken,
} from "@/server/services/manager-tenant-onboarding.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import {
  acceptManagerTenantAgreementSchema,
  approveManagerTenantOnboardingRequestSchema,
  createManagerTenantOnboardingRequestSchema,
  declineManagerTenantAgreementSchema,
  rejectManagerTenantOnboardingRequestSchema,
  resendManagerFirstRentPaymentLinkSchema,
  resendManagerTenantOnboardingLinkSchema,
  submitManagerTenantOnboardingRequestSchema,
} from "@/server/validators/manager-tenant-onboarding.schema";

function toActionError(error: unknown): ManagerTenantOnboardingActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createManagerTenantOnboardingRequestAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = createManagerTenantOnboardingRequestSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      onboardingType: formData.get("onboardingType"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      note: formData.get("note"),
    });

    const result =
      await createManagerTenantOnboardingRequestForCurrentManager(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");

    return {
      ok: true,
      message: "Tenant detail link is ready.",
      requestId: result.request.id,
      claimUrl: result.claimUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitManagerTenantOnboardingRequestAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    const parsed = submitManagerTenantOnboardingRequestSchema.parse({
      token: formData.get("token"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      occupation: formData.get("occupation"),
      idType: formData.get("idType"),
      idNumber: formData.get("idNumber"),
      moveInDate: formData.get("moveInDate"),
      claimedRentAmount: formData.get("claimedRentAmount"),
      paymentFrequency: formData.get("paymentFrequency"),
      tenantNotes: formData.get("tenantNotes"),
    });

    await submitManagerTenantOnboardingRequestByToken(parsed);

    return {
      ok: true,
      message: "Your details have been submitted.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveManagerTenantOnboardingRequestAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = approveManagerTenantOnboardingRequestSchema.parse({
      requestId: formData.get("requestId"),
      confirmedRentAmount: formData.get("confirmedRentAmount"),
      confirmedMoveInDate: formData.get("confirmedMoveInDate"),
      openingBalance: formData.get("openingBalance"),
      reviewNotes: formData.get("reviewNotes"),
    });

    const result =
      await approveManagerTenantOnboardingRequestForCurrentManager(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: result.agreement
        ? "Agreement link is ready."
        : "Current occupant approved and added to the unit.",
      tenantId: result.tenant.id,
      agreementId: result.agreement?.id,
      agreementUrl: result.agreementUrl ?? undefined,
      whatsappMessage: result.whatsappMessage ?? undefined,
      tenantWhatsappNumber: result.tenantWhatsappNumber ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectManagerTenantOnboardingRequestAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = rejectManagerTenantOnboardingRequestSchema.parse({
      requestId: formData.get("requestId"),
      reason: formData.get("reason"),
    });

    await rejectManagerTenantOnboardingRequestForCurrentManager(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");

    return {
      ok: true,
      message: "Tenant details rejected.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendManagerTenantOnboardingLinkAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = resendManagerTenantOnboardingLinkSchema.parse({
      requestId: formData.get("requestId"),
    });

    const result =
      await resendManagerTenantOnboardingLinkForCurrentManager(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");

    return {
      ok: true,
      message: "Tenant detail link is ready.",
      requestId: parsed.requestId,
      claimUrl: result.claimUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendManagerFirstRentPaymentLinkAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = resendManagerFirstRentPaymentLinkSchema.parse({
      requestId: formData.get("requestId"),
    });

    const result =
      await resendManagerFirstRentPaymentLinkForCurrentManager(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Payment link is ready.",
      requestId: parsed.requestId,
      paymentRequestId: result.paymentRequestId,
      paymentUrl: result.paymentUrl,
      paymentExpiresAt: result.paymentExpiresAt,
      paymentBreakdown: result.paymentBreakdown,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptManagerTenantAgreementAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    const parsed = acceptManagerTenantAgreementSchema.parse({
      token: formData.get("token"),
    });

    const requestHeaders = await headers();

    const result = await acceptManagerTenantAgreementAndCreatePayment({
      ...parsed,
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent"),
    });

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath(`/manager/properties/${result.agreement.property_id}`);
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Agreement accepted. Review the payment summary to continue.",
      agreementId: result.agreement.id,
      paymentRequestId: result.paymentRequestId ?? undefined,
      paymentUrl: result.paymentUrl ?? undefined,
      paymentExpiresAt: result.paymentExpiresAt ?? undefined,
      paymentBreakdown: result.paymentBreakdown ?? null,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function declineManagerTenantAgreementAction(
  _previousState: ManagerTenantOnboardingActionState,
  formData: FormData,
): Promise<ManagerTenantOnboardingActionState> {
  try {
    const parsed = declineManagerTenantAgreementSchema.parse({
      token: formData.get("token"),
      reason: formData.get("reason"),
    });

    const requestHeaders = await headers();

    const result = await declineManagerTenantAgreementAndCancel({
      ...parsed,
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent"),
    });

    revalidatePath("/manager");
    revalidatePath("/manager/properties");
    revalidatePath(`/manager/properties/${result.agreement.property_id}`);
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");

    return {
      ok: true,
      message: "Agreement declined. The property manager has been notified.",
      agreementId: result.agreement.id,
      agreementDeclined: true,
    };
  } catch (error) {
    return toActionError(error);
  }
}
