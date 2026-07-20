"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createDeveloperSaleFromAssignment } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import { createDeveloperSaleSchema } from "@/server/validators/developer-sale.schema";

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

export async function createDeveloperSaleAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let saleId: string | null = null;

  try {
    const developer = await requireDeveloper();
    const parsed = createDeveloperSaleSchema.parse({
      plotAssignmentId: formData.get("plotAssignmentId"),
      paymentPlanMode: formData.get("paymentPlanMode"),
      totalPriceLocked: formData.get("totalPriceLocked"),
      initialDepositAmount: formData.get("initialDepositAmount") || 0,
      saleDate: formData.get("saleDate"),
      expectedCompletionDate: formData.get("expectedCompletionDate"),
      notes: formData.get("notes"),
    });

    if (parsed.initialDepositAmount > parsed.totalPriceLocked) {
      return {
        ok: false,
        message: "Initial deposit cannot exceed the locked sale price.",
      };
    }

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

    const sale = await createDeveloperSaleFromAssignment(supabase, {
      developerAccountId: account.id,
      plotAssignmentId: parsed.plotAssignmentId,
      paymentPlanMode: parsed.paymentPlanMode,
      totalPriceLocked: parsed.totalPriceLocked,
      initialDepositAmount: parsed.initialDepositAmount,
      saleDate: parsed.saleDate,
      expectedCompletionDate: nullableText(parsed.expectedCompletionDate),
      notes: nullableText(parsed.notes),
    });

    saleId = sale.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/developer/sales");
  revalidatePath("/developer/estates");

  if (saleId) {
    redirect(`/developer/sales/${saleId}`);
  }

  return {
    ok: true,
    message: "Sale created successfully.",
  };
}
