"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DeveloperPayoutSetupActionState } from "@/actions/developer-payout.state";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloperWorkspaceOperator } from "@/server/services/auth.service";
import { setupDeveloperPayoutAccount } from "@/server/services/developer-payout.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const setupDeveloperPayoutAccountSchema = z.object({
  bankCode: z.string().trim().min(1, "Select a payout bank."),
  bankName: z.string().trim().min(1, "Bank name is required."),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit account number."),
});

function toActionError(error: unknown): DeveloperPayoutSetupActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function cleanOptionalText(value: string | null | undefined) {
  const cleaned = value?.trim();

  return cleaned && cleaned.length > 0 ? cleaned : null;
}

function revalidateDeveloperPayoutSurfaces() {
  revalidatePath("/developer/settings");
  revalidatePath("/developer");
  revalidatePath("/admin");
  revalidatePath("/admin/payout-verifications");
}

export async function setupDeveloperPayoutAccountAction(
  _previousState: DeveloperPayoutSetupActionState,
  formData: FormData,
): Promise<DeveloperPayoutSetupActionState> {
  try {
    const parsed = setupDeveloperPayoutAccountSchema.parse({
      bankCode: formData.get("bankCode"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
    });

    const developer = await requireDeveloperWorkspaceOperator();
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

    await setupDeveloperPayoutAccount({
      supabase,
      developerAccountId: account.id,
      businessName: account.company_name,
      contactName: developer.fullName,
      contactPhoneNumber: cleanOptionalText(account.company_phone),
      contactEmail: cleanOptionalText(account.company_email),
      bankCode: parsed.bankCode,
      bankName: parsed.bankName,
      accountNumber: parsed.accountNumber,
    });

    revalidateDeveloperPayoutSurfaces();

    return {
      ok: true,
      message:
        "Payout account submitted. BOPA admin must verify it before you can send buyer purchase links.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
