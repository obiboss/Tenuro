"use server";

import { redirect } from "next/navigation";
import type { DeveloperBuyerPortalActionState } from "@/actions/developer-buyer-portal.state";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createBuyerSalePortalLink } from "@/server/services/developer-buyer-portal.service";
import { createBuyerPortalSchedulePaymentRequest } from "@/server/services/developer-payment.service";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function toActionError(error: unknown): DeveloperBuyerPortalActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createBuyerSalePortalLinkAction(
  _previousState: DeveloperBuyerPortalActionState,
  formData: FormData,
): Promise<DeveloperBuyerPortalActionState> {
  try {
    const saleId = String(formData.get("saleId") ?? "").trim();

    if (!saleId) {
      return {
        ok: false,
        message: "Sale is required.",
      };
    }

    const developer = await requireDeveloper();
    const supabase = createSupabaseAdminClient();
    const account = await getDeveloperAccountByOwnerProfileId(
      supabase,
      developer.id,
    );

    if (!account || account.status !== "active") {
      return {
        ok: false,
        message: "Developer account is not active.",
      };
    }

    const result = await createBuyerSalePortalLink({
      supabase,
      developerAccountId: account.id,
      developerProfileId: developer.id,
      saleId,
    });

    return {
      ok: true,
      message:
        "Buyer portal link ready. Send this link to the buyer so they can view payments, receipts, documents, balance, and next payment.",
      portalUrl: result.portalUrl,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function initiateBuyerPortalSchedulePaymentAction(
  formData: FormData,
): Promise<never> {
  const token = String(formData.get("token") ?? "").trim();
  const scheduleItemId = String(formData.get("scheduleItemId") ?? "").trim();

  const supabase = createSupabaseAdminClient();

  const result = await createBuyerPortalSchedulePaymentRequest({
    supabase,
    token,
    scheduleItemId,
  });

  redirect(`/dev/pay/${encodeURIComponent(result.intent.paystack_reference)}`);
}
