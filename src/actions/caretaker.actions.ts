"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import {
  acceptCaretakerInviteForCurrentUser,
  acceptCaretakerInviteWithSignup,
  createCaretakerInviteForCurrentLandlord,
  revokeCaretakerAccessForCurrentLandlord,
} from "@/server/services/caretaker-invites.service";
import {
  confirmCaretakerPaymentClaimForCurrentLandlord,
  createCaretakerProofRequestForCurrentCaretaker,
  rejectCaretakerPaymentClaimForCurrentLandlord,
  reportCaretakerPaymentForCurrentCaretaker,
  submitTenantPaymentProof,
} from "@/server/services/caretaker-payment-claims.service";
import {
  acceptCaretakerInviteSchema,
  acceptCaretakerInviteSignupSchema,
  createCaretakerInviteSchema,
  revokeCaretakerAccessSchema,
} from "@/server/validators/caretaker.schema";
import {
  confirmCaretakerPaymentClaimSchema,
  createCaretakerProofRequestSchema,
  rejectCaretakerPaymentClaimSchema,
  reportCaretakerPaymentSchema,
  submitTenantPaymentProofSchema,
} from "@/server/validators/caretaker-payment-claims.schema";
import type {
  CaretakerAcceptActionState,
  CaretakerInviteActionState,
  CaretakerPaymentClaimDecisionActionState,
  CaretakerProofRequestActionState,
  CaretakerReportPaymentActionState,
  CaretakerRevokeActionState,
  TenantPaymentProofActionState,
} from "./caretaker.state";

function toInviteError(error: unknown): CaretakerInviteActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function toAcceptError(error: unknown): CaretakerAcceptActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function toProofRequestError(error: unknown): CaretakerProofRequestActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function toReportPaymentError(
  error: unknown,
): CaretakerReportPaymentActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function toTenantProofError(error: unknown): TenantPaymentProofActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function toDecisionError(
  error: unknown,
): CaretakerPaymentClaimDecisionActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function getOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export async function createCaretakerInviteAction(
  _previousState: CaretakerInviteActionState,
  formData: FormData,
): Promise<CaretakerInviteActionState> {
  try {
    const propertyIds = formData.getAll("propertyIds").map(String);
    const parsed = createCaretakerInviteSchema.parse({
      caretakerName: formData.get("caretakerName"),
      caretakerPhone: formData.get("caretakerPhone"),
      propertyIds,
      note: formData.get("note") || undefined,
    });

    const result = await createCaretakerInviteForCurrentLandlord(parsed);

    revalidatePath("/caretakers");

    return {
      ok: true,
      message:
        "Caretaker invite created. Send it on WhatsApp or copy the link.",
      inviteUrl: result.inviteUrl,
      whatsappMessage: result.whatsappMessage,
      caretakerPhone: result.caretakerPhone,
    };
  } catch (error) {
    return toInviteError(error);
  }
}

export async function acceptCaretakerInviteAction(
  _previousState: CaretakerAcceptActionState,
  formData: FormData,
): Promise<CaretakerAcceptActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = acceptCaretakerInviteSchema.parse({
      token: formData.get("token"),
    });

    const result = await acceptCaretakerInviteForCurrentUser(parsed);
    redirectTo = result.redirectTo;
  } catch (error) {
    return toAcceptError(error);
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return {
    ok: true,
    message: "Invite accepted.",
  };
}

export async function acceptCaretakerInviteSignupAction(
  _previousState: CaretakerAcceptActionState,
  formData: FormData,
): Promise<CaretakerAcceptActionState> {
  let redirectTo: string | null = null;

  try {
    const parsed = acceptCaretakerInviteSignupSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });

    const result = await acceptCaretakerInviteWithSignup(parsed);
    redirectTo = result.redirectTo;
  } catch (error) {
    return toAcceptError(error);
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return {
    ok: true,
    message: "Caretaker account created and invite accepted.",
  };
}

export async function revokeCaretakerAccessAction(
  _previousState: CaretakerRevokeActionState,
  formData: FormData,
): Promise<CaretakerRevokeActionState> {
  try {
    const propertyIdValue = formData.get("propertyId");
    const parsed = revokeCaretakerAccessSchema.parse({
      caretakerProfileId: formData.get("caretakerProfileId"),
      propertyId:
        typeof propertyIdValue === "string" && propertyIdValue.length > 0
          ? propertyIdValue
          : undefined,
    });

    await revokeCaretakerAccessForCurrentLandlord(parsed);

    revalidatePath("/caretakers");
    revalidatePath("/caretaker/overview");

    return {
      ok: true,
      message: "Caretaker access removed.",
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
    };
  }
}

export async function createCaretakerProofRequestAction(
  _previousState: CaretakerProofRequestActionState,
  formData: FormData,
): Promise<CaretakerProofRequestActionState> {
  try {
    const parsed = createCaretakerProofRequestSchema.parse({
      tenancyId: formData.get("tenancyId"),
    });

    const result = await createCaretakerProofRequestForCurrentCaretaker(parsed);

    revalidatePath("/caretaker/overview");

    return {
      ok: true,
      message: "Proof link created. Send it to the tenant on WhatsApp.",
      proofUrl: result.proofUrl,
      whatsappMessage: result.whatsappMessage,
      tenantPhone: result.tenantPhone,
    };
  } catch (error) {
    return toProofRequestError(error);
  }
}

export async function reportCaretakerPaymentAction(
  _previousState: CaretakerReportPaymentActionState,
  formData: FormData,
): Promise<CaretakerReportPaymentActionState> {
  try {
    const parsed = reportCaretakerPaymentSchema.parse({
      tenancyId: formData.get("tenancyId"),
      amountPaid: formData.get("amountPaid"),
      paymentDate: formData.get("paymentDate"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference") || undefined,
      notes: formData.get("notes") || undefined,
    });

    await reportCaretakerPaymentForCurrentCaretaker(
      parsed,
      getOptionalFile(formData, "proofFile"),
    );

    revalidatePath("/caretaker/overview");
    revalidatePath("/payments/claims");

    return {
      ok: true,
      message:
        "Payment report submitted. It is waiting for landlord confirmation.",
    };
  } catch (error) {
    return toReportPaymentError(error);
  }
}

export async function submitTenantPaymentProofAction(
  _previousState: TenantPaymentProofActionState,
  formData: FormData,
): Promise<TenantPaymentProofActionState> {
  try {
    const parsed = submitTenantPaymentProofSchema.parse({
      token: formData.get("token"),
      amountPaid: formData.get("amountPaid"),
      paymentDate: formData.get("paymentDate"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference") || undefined,
      notes: formData.get("notes") || undefined,
    });

    await submitTenantPaymentProof(
      parsed,
      getOptionalFile(formData, "proofFile"),
    );

    revalidatePath("/caretaker/overview");
    revalidatePath("/payments/claims");

    return {
      ok: true,
      message:
        "Payment proof submitted. It is waiting for landlord confirmation.",
    };
  } catch (error) {
    return toTenantProofError(error);
  }
}

export async function confirmCaretakerPaymentClaimAction(
  _previousState: CaretakerPaymentClaimDecisionActionState,
  formData: FormData,
): Promise<CaretakerPaymentClaimDecisionActionState> {
  try {
    const parsed = confirmCaretakerPaymentClaimSchema.parse({
      claimId: formData.get("claimId"),
    });

    await confirmCaretakerPaymentClaimForCurrentLandlord(parsed);

    revalidatePath("/payments");
    revalidatePath("/payments/claims");
    revalidatePath("/overview");
    revalidatePath("/caretaker/overview");

    return {
      ok: true,
      message: "Payment confirmed and recorded.",
    };
  } catch (error) {
    return toDecisionError(error);
  }
}

export async function rejectCaretakerPaymentClaimAction(
  _previousState: CaretakerPaymentClaimDecisionActionState,
  formData: FormData,
): Promise<CaretakerPaymentClaimDecisionActionState> {
  try {
    const parsed = rejectCaretakerPaymentClaimSchema.parse({
      claimId: formData.get("claimId"),
      rejectionReason: formData.get("rejectionReason"),
    });

    await rejectCaretakerPaymentClaimForCurrentLandlord(parsed);

    revalidatePath("/payments/claims");
    revalidatePath("/caretaker/overview");

    return {
      ok: true,
      message: "Payment claim rejected.",
    };
  } catch (error) {
    return toDecisionError(error);
  }
}
