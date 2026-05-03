"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  activateTenantAccount,
  generateTenantActivationLink,
} from "@/server/services/tenant-activation.service";
import {
  activateTenantAccountSchema,
  generateTenantActivationLinkSchema,
} from "@/server/validators/tenant-activation.schema";

export type TenantActivationInviteActionState = {
  ok: boolean;
  message: string;
  activationUrl?: string;
  whatsappMessage?: string;
  expiresAt?: string;
  fieldErrors?: Record<string, string[]>;
};

export type TenantActivationActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function generateTenantActivationLinkAction(
  _previousState: TenantActivationInviteActionState,
  formData: FormData,
): Promise<TenantActivationInviteActionState> {
  try {
    const parsed = generateTenantActivationLinkSchema.parse({
      tenantId: formData.get("tenantId"),
    });

    const result = await generateTenantActivationLink(parsed.tenantId);

    return {
      ok: true,
      message: "Tenant activation link prepared.",
      activationUrl: result.activationUrl,
      whatsappMessage: result.whatsappMessage,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error("generateTenantActivationLinkAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function activateTenantAccountAction(
  _previousState: TenantActivationActionState,
  formData: FormData,
): Promise<TenantActivationActionState> {
  let shouldRedirect = false;

  try {
    const parsed = activateTenantAccountSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    await activateTenantAccount(parsed);

    revalidatePath("/tenant");

    shouldRedirect = true;
  } catch (error) {
    console.error("activateTenantAccountAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  if (shouldRedirect) {
    redirect("/tenant");
  }

  return {
    ok: true,
    message: "Tenant account activated.",
  };
}
