"use server";

import { revalidatePath } from "next/cache";
import type { BusinessWorkspaceType } from "@/constants/business-subscription";
import { errorResult } from "@/server/errors/result";
import {
  requireDeveloperUser,
  requireManagerUser,
} from "@/server/services/auth.service";
import {
  getBusinessSubscriptionManageUrl,
  initializeBusinessSubscriptionCheckout,
} from "@/server/services/business-subscription.service";
import {
  businessSubscriptionCheckoutSchema,
  businessSubscriptionManageSchema,
} from "@/server/validators/subscription.schema";

export type BusinessSubscriptionActionState = {
  ok: boolean;
  message: string;
  redirectUrl?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialBusinessSubscriptionActionState: BusinessSubscriptionActionState =
  {
    ok: false,
    message: "",
  };

function toActionError(error: unknown): BusinessSubscriptionActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

async function requireBusinessWorkspaceUser(
  workspaceType: BusinessWorkspaceType,
) {
  if (workspaceType === "manager") {
    return requireManagerUser();
  }

  return requireDeveloperUser();
}

function revalidateSubscriptionPaths() {
  revalidatePath("/manager");
  revalidatePath("/manager/subscription");
  revalidatePath("/developer");
  revalidatePath("/developer/subscription");
}

export async function initializeBusinessSubscriptionAction(
  _previousState: BusinessSubscriptionActionState,
  formData: FormData,
): Promise<BusinessSubscriptionActionState> {
  try {
    const parsed = businessSubscriptionCheckoutSchema.parse({
      workspaceType: formData.get("workspaceType"),
      billingInterval: formData.get("billingInterval"),
      billingEmail: formData.get("billingEmail"),
    });
    const user = await requireBusinessWorkspaceUser(parsed.workspaceType);
    const checkout = await initializeBusinessSubscriptionCheckout({
      profileId: user.id,
      workspaceType: parsed.workspaceType,
      billingInterval: parsed.billingInterval,
      billingEmail: parsed.billingEmail,
    });

    revalidateSubscriptionPaths();

    return {
      ok: true,
      message: "Secure checkout is ready.",
      redirectUrl: checkout.authorizationUrl,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function manageBusinessSubscriptionAction(
  _previousState: BusinessSubscriptionActionState,
  formData: FormData,
): Promise<BusinessSubscriptionActionState> {
  try {
    const parsed = businessSubscriptionManageSchema.parse({
      workspaceType: formData.get("workspaceType"),
    });
    const user = await requireBusinessWorkspaceUser(parsed.workspaceType);
    const redirectUrl = await getBusinessSubscriptionManageUrl({
      profileId: user.id,
      workspaceType: parsed.workspaceType,
    });

    return {
      ok: true,
      message: "Opening secure billing settings.",
      redirectUrl,
    };
  } catch (error) {
    return toActionError(error);
  }
}
