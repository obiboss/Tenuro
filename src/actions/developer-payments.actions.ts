"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createDeveloperPaymentRequest } from "@/server/services/developer-payment.service";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import { createDeveloperPaymentRequestSchema } from "@/server/validators/developer-payment.schema";

function toActionError(error: unknown): AuthActionState {
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

export async function createDeveloperPaymentRequestAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const developer = await requireDeveloper();
    const parsed = createDeveloperPaymentRequestSchema.parse({
      saleId: formData.get("saleId"),
      scheduleItemId: formData.get("scheduleItemId"),
      amount: formData.get("amount"),
      buyerEmail: formData.get("buyerEmail"),
    });

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

    const intent = await createDeveloperPaymentRequest({
      supabase,
      developerAccountId: account.id,
      saleId: parsed.saleId,
      scheduleItemId: nullableText(parsed.scheduleItemId),
      amount: parsed.amount,
      buyerEmail: nullableText(parsed.buyerEmail),
    });

    revalidatePath(`/developer/sales/${parsed.saleId}`);

    return {
      ok: true,
      message: `Payment link created: ${intent.authorization_url}`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
