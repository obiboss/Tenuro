"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  confirmTenantMoveOutForCurrentLandlord,
  createQuitNoticeDraftForCurrentLandlord,
  createTenantMoveOutNoticeForCurrentTenant,
  issueQuitNoticeForCurrentLandlord,
  prepareQuitNoticeDeliveryForCurrentLandlord,
} from "@/server/services/quit-notices.service";
import type {
  ConfirmMoveOutActionState,
  QuitNoticeActionState,
  TenantMoveOutNoticeActionState,
} from "./quit-notices.state";

function readRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export async function createAndIssueQuitNoticeAction(
  _previousState: QuitNoticeActionState,
  formData: FormData,
): Promise<QuitNoticeActionState> {
  try {
    const tenantId = readRequiredString(formData, "tenantId");
    const tenancyId = readRequiredString(formData, "tenancyId");

    const draft = await createQuitNoticeDraftForCurrentLandlord({
      tenancyId,
      noticeType: "landlord_quit_notice",
      noticeDate: readRequiredString(formData, "noticeDate"),
      vacateByDate: readRequiredString(formData, "vacateByDate"),
      reason: readRequiredString(formData, "reason"),
      landlordNotes: String(formData.get("landlordNotes") ?? "").trim() || null,
      deliveryMethod: "whatsapp",
    });

    const issuedNotice = await issueQuitNoticeForCurrentLandlord({
      quitNoticeId: draft.id,
    });

    const delivery = await prepareQuitNoticeDeliveryForCurrentLandlord(
      issuedNotice.id,
    );

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenantId}`);

    return {
      ok: true,
      message:
        "Quit notice prepared. You can download the PDF or open the WhatsApp draft.",
      quitNoticeId: issuedNotice.id,
      pdfDownloadUrl: delivery.pdfDownloadUrl,
      whatsappUrl: delivery.whatsappUrl,
      whatsappMessage: delivery.whatsappMessage,
    };
  } catch (error) {
    console.error("createAndIssueQuitNoticeAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function createTenantMoveOutNoticeAction(
  _previousState: TenantMoveOutNoticeActionState,
  formData: FormData,
): Promise<TenantMoveOutNoticeActionState> {
  try {
    const moveOutNotice = await createTenantMoveOutNoticeForCurrentTenant({
      plannedMoveOutDate: readRequiredString(formData, "plannedMoveOutDate"),
      reason: readRequiredString(formData, "reason"),
    });

    revalidatePath("/tenant");

    return {
      ok: true,
      message:
        "Your move-out notice has been submitted. Your landlord will review it.",
      quitNoticeId: moveOutNotice.id,
    };
  } catch (error) {
    console.error("createTenantMoveOutNoticeAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function confirmTenantMoveOutAction(
  _previousState: ConfirmMoveOutActionState,
  formData: FormData,
): Promise<ConfirmMoveOutActionState> {
  try {
    const tenantId = readRequiredString(formData, "tenantId");

    await confirmTenantMoveOutForCurrentLandlord({
      quitNoticeId: readRequiredString(formData, "quitNoticeId"),
      actualMoveOutDate: readRequiredString(formData, "actualMoveOutDate"),
      finalNote: String(formData.get("finalNote") ?? "").trim() || null,
    });

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath("/units");
    revalidatePath("/properties");

    return {
      ok: true,
      message:
        "Move-out confirmed. The tenancy has been closed and the unit is now vacant.",
    };
  } catch (error) {
    console.error("confirmTenantMoveOutAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
