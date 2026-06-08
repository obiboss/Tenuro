"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createDeveloperPaymentPlan } from "@/server/repositories/developer-payment-plans.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import { createDeveloperPaymentPlanSchema } from "@/server/validators/developer-payment-plan.schema";

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

export async function createDeveloperPaymentPlanAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let saleId: string | null = null;

  try {
    const developer = await requireDeveloper();
    const parsed = createDeveloperPaymentPlanSchema.parse({
      saleId: formData.get("saleId"),
      paymentPlanMode: formData.get("paymentPlanMode"),
      scheduleStartDate: formData.get("scheduleStartDate"),
      notes: formData.get("notes"),
      scheduleItemsJson: formData.get("scheduleItemsJson"),
    });

    const supabase = await createSupabaseServerClient();
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

    const sale = await getDeveloperSaleById(supabase, {
      developerAccountId: account.id,
      saleId: parsed.saleId,
    });

    if (!sale || sale.status !== "active") {
      return {
        ok: false,
        message: "Active sale was not found.",
      };
    }

    const scheduleTotal = parsed.scheduleItemsJson.reduce(
      (total, item) => total + item.expectedAmount,
      0,
    );

    if (
      Number(scheduleTotal.toFixed(2)) !==
      Number(Number(sale.total_price_locked).toFixed(2))
    ) {
      return {
        ok: false,
        message: "Payment schedule total must equal the locked sale price.",
      };
    }

    await createDeveloperPaymentPlan(supabase, {
      developerAccountId: account.id,
      saleId: sale.id,
      paymentPlanMode: parsed.paymentPlanMode,
      scheduleStartDate: parsed.scheduleStartDate,
      notes: nullableText(parsed.notes),
      items: parsed.scheduleItemsJson.map((item, index) => ({
        label: item.label,
        due_date: item.dueDate,
        expected_amount: Number(item.expectedAmount.toFixed(2)),
        sort_order: item.sortOrder || index,
      })),
    });

    saleId = sale.id;
  } catch (error) {
    return toActionError(error);
  }

  if (saleId) {
    revalidatePath(`/developer/sales/${saleId}`);
    revalidatePath(`/developer/sales/${saleId}/payment-plan`);
    redirect(`/developer/sales/${saleId}`);
  }

  return {
    ok: true,
    message: "Payment plan created successfully.",
  };
}
