"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DeveloperBuyerPurchaseActionState } from "@/actions/developer-buyer-purchase.state";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import {
  initiateBuyerPurchasePayment,
  startDeveloperBuyerPurchase,
} from "@/server/services/developer-buyer-purchase.service";
import { assertDeveloperPayoutAccountVerified } from "@/server/services/developer-payout.service";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  startDeveloperBuyerPurchaseSchema,
  submitBuyerPurchaseDetailsSchema,
} from "@/server/validators/developer-buyer-purchase.schema";
import { normalisePhoneNumber } from "@/server/utils/phone";

function toActionError(error: unknown): DeveloperBuyerPurchaseActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function startDeveloperBuyerPurchaseAction(
  _previousState: DeveloperBuyerPurchaseActionState,
  formData: FormData,
): Promise<DeveloperBuyerPurchaseActionState> {
  try {
    const parsed = startDeveloperBuyerPurchaseSchema.parse({
      estateId: formData.get("estateId"),
      plotId: formData.get("plotId"),
      buyerPhone: formData.get("buyerPhone"),
      buyerName: formData.get("buyerName"),
      buyerEmail: formData.get("buyerEmail"),
      note: formData.get("note"),
    });

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

    await assertDeveloperPayoutAccountVerified({
      supabase,
      developerAccountId: account.id,
    });

    const estate = await getDeveloperEstateById(supabase, {
      developerAccountId: account.id,
      estateId: parsed.estateId,
    });

    if (!estate) {
      return {
        ok: false,
        message: "Estate was not found for this developer account.",
      };
    }

    const buyerPhone = normalisePhoneNumber(parsed.buyerPhone);

    const result = await startDeveloperBuyerPurchase({
      supabase,
      developerAccountId: account.id,
      developerProfileId: developer.id,
      estateId: parsed.estateId,
      plotId: parsed.plotId,
      buyerPhone: buyerPhone.national,
      buyerName: nullableText(parsed.buyerName),
      buyerEmail: nullableText(parsed.buyerEmail),
      note: nullableText(parsed.note),
    });

    revalidatePath(`/developer/estates/${parsed.estateId}`);

    return {
      ok: true,
      message:
        "Buyer purchase link created. Send this link to the buyer so they can complete their details and make payment.",
      purchaseUrl: result.purchaseUrl,
      buyerPhone: buyerPhone.national,
      buyerName: nullableText(parsed.buyerName) ?? "Buyer",
      companyName: account.company_name,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function initiateBuyerPurchasePaymentAction(
  formData: FormData,
): Promise<never> {
  const parsed = submitBuyerPurchaseDetailsSchema.parse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    phoneNumber: formData.get("phoneNumber"),
    email: formData.get("email"),
    nin: formData.get("nin"),
    residentialAddress: formData.get("residentialAddress"),
    nextOfKinName: formData.get("nextOfKinName"),
    nextOfKinPhone: formData.get("nextOfKinPhone"),
  });

  const supabase = createSupabaseAdminClient();

  const result = await initiateBuyerPurchasePayment({
    supabase,
    token: parsed.token,
    details: parsed,
  });

  redirect(result.authorizationUrl);
}
