"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/server/errors/app-error";
import { errorResult } from "@/server/errors/result";
import {
  failPlatformAdminPayoutAccount,
  verifyPlatformAdminPayoutAccount,
  type PayoutVerificationAccountType,
} from "@/server/services/platform-admin-payout-verification.service";

export type PlatformAdminPayoutVerificationActionState = {
  ok: boolean;
  message: string;
};

function parsePayoutVerificationFormData(formData: FormData) {
  const accountType = String(formData.get("accountType") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const expectedUpdatedAt = String(
    formData.get("expectedUpdatedAt") ?? "",
  ).trim();

  if (accountType !== "landlord" && accountType !== "agent") {
    throw new AppError(
      "INVALID_PAYOUT_ACCOUNT_TYPE",
      "The payout account type is invalid.",
      400,
    );
  }

  if (!accountId || !expectedUpdatedAt) {
    throw new AppError(
      "PAYOUT_ACCOUNT_REFERENCE_MISSING",
      "Payout account reference is missing.",
      400,
    );
  }

  return {
    accountType: accountType as PayoutVerificationAccountType,
    accountId,
    expectedUpdatedAt,
  };
}

function revalidatePayoutVerificationSurfaces() {
  revalidatePath("/admin/payout-verifications");
  revalidatePath("/settings");
  revalidatePath("/agent/overview");
}

function toActionError(
  error: unknown,
): PlatformAdminPayoutVerificationActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
  };
}

export async function verifyPayoutAccountAction(
  _previousState: PlatformAdminPayoutVerificationActionState,
  formData: FormData,
): Promise<PlatformAdminPayoutVerificationActionState> {
  try {
    const parsed = parsePayoutVerificationFormData(formData);

    await verifyPlatformAdminPayoutAccount(parsed);

    revalidatePayoutVerificationSurfaces();

    return {
      ok: true,
      message: "Payout account verified successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function failPayoutAccountAction(
  _previousState: PlatformAdminPayoutVerificationActionState,
  formData: FormData,
): Promise<PlatformAdminPayoutVerificationActionState> {
  try {
    const parsed = parsePayoutVerificationFormData(formData);

    await failPlatformAdminPayoutAccount(parsed);

    revalidatePayoutVerificationSurfaces();

    return {
      ok: true,
      message: "Payout account marked as failed.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
