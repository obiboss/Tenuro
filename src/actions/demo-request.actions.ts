"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type {
  DemoRequestActionState,
  PlatformAdminDemoRequestActionState,
} from "@/actions/demo-request.state";
import { errorResult } from "@/server/errors/result";
import {
  buildDemoRequestFingerprint,
  changePlatformAdminDemoRequestStatus,
  submitPublicDemoRequest,
} from "@/server/services/demo-request.service";
import {
  submitDemoRequestSchema,
  updateDemoRequestStatusSchema,
} from "@/server/validators/demo-request.schema";

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function submitDemoRequestAction(
  _previousState: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  try {
    const parsed = submitDemoRequestSchema.parse({
      workspaceType: readFormText(formData, "workspaceType"),
      fullName: readFormText(formData, "fullName"),
      companyName: readFormText(formData, "companyName"),
      workEmail: readFormText(formData, "workEmail"),
      phoneNumber: readFormText(formData, "phoneNumber"),
      preferredDate: readFormText(formData, "preferredDate"),
      preferredTimeWindow: readFormText(formData, "preferredTimeWindow"),
      message: readFormText(formData, "message"),
      website: readFormText(formData, "website"),
    });
    const requestHeaders = await headers();
    const fingerprintHash = buildDemoRequestFingerprint({
      forwardedFor: requestHeaders.get("x-forwarded-for"),
      realIp: requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    });
    const result = await submitPublicDemoRequest({
      input: parsed,
      fingerprintHash,
    });

    return {
      ok: true,
      message: result.duplicate
        ? "We already have your recent demo request. The BOPA team will contact you to confirm a suitable time."
        : "Your demo request has been received. The BOPA team will contact you to confirm a suitable time.",
      requestId: result.requestId,
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

export async function updateDemoRequestStatusAction(
  _previousState: PlatformAdminDemoRequestActionState,
  formData: FormData,
): Promise<PlatformAdminDemoRequestActionState> {
  try {
    const parsed = updateDemoRequestStatusSchema.parse({
      requestId: readFormText(formData, "requestId"),
      status: readFormText(formData, "status"),
    });

    await changePlatformAdminDemoRequestStatus(parsed);

    revalidatePath("/admin");
    revalidatePath("/admin/demo-requests");

    return {
      ok: true,
      message: "Demo request updated.",
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
    };
  }
}
