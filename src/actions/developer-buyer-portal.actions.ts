"use server";

import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createBuyerSalePortalLink } from "@/server/services/developer-buyer-portal.service";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { DeveloperBuyerPortalActionState } from "@/actions/developer-buyer-portal.state";

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
      message: "Buyer payment portal link created.",
      portalUrl: result.portalUrl,
    };
  } catch (error) {
    return toActionError(error);
  }
}
