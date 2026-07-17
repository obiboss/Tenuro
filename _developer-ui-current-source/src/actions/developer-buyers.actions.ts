"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { createDeveloperBuyer } from "@/server/repositories/developer-buyers.repository";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import { assignDeveloperBuyerToPlot } from "@/server/repositories/developer-plot-assignments.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { AuthActionState } from "@/server/types/auth.types";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  assignDeveloperBuyerToPlotSchema,
  createDeveloperBuyerSchema,
} from "@/server/validators/developer-buyer.schema";

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

async function getActiveDeveloperAccount() {
  const developer = await requireDeveloper();
  const adminSupabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    adminSupabase,
    developer.id,
  );

  if (!account || account.status !== "active") {
    return {
      ok: false as const,
      message: "Developer account is not active.",
      developer,
      account: null,
      adminSupabase,
    };
  }

  return {
    ok: true as const,
    message: "",
    developer,
    account,
    adminSupabase,
  };
}

export async function createDeveloperBuyerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let shouldRedirect = false;

  try {
    const parsed = createDeveloperBuyerSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      nin: formData.get("nin"),
      nextOfKinName: formData.get("nextOfKinName"),
      nextOfKinPhone: formData.get("nextOfKinPhone"),
      residentialAddress: formData.get("residentialAddress"),
    });

    const context = await getActiveDeveloperAccount();

    if (!context.ok || !context.account) {
      return {
        ok: false,
        message: context.message,
      };
    }

    const buyerPhone = normalisePhoneNumber(parsed.phoneNumber);
    const nextOfKinPhone = normalisePhoneNumber(parsed.nextOfKinPhone);

    await createDeveloperBuyer(context.adminSupabase, {
      developerAccountId: context.account.id,
      fullName: parsed.fullName,
      phoneNumber: buyerPhone.e164,
      email: nullableText(parsed.email),
      nin: parsed.nin,
      nextOfKinName: parsed.nextOfKinName,
      nextOfKinPhone: nextOfKinPhone.e164,
      residentialAddress: parsed.residentialAddress,
    });

    shouldRedirect = true;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/developer/buyers");

  if (shouldRedirect) {
    redirect("/developer/buyers");
  }

  return {
    ok: true,
    message: "Buyer created successfully.",
  };
}

export async function assignDeveloperBuyerToPlotAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = assignDeveloperBuyerToPlotSchema.parse({
      buyerId: formData.get("buyerId"),
      estateId: formData.get("estateId"),
      plotId: formData.get("plotId"),
      assignmentNote: formData.get("assignmentNote"),
    });

    const context = await getActiveDeveloperAccount();

    if (!context.ok || !context.account) {
      return {
        ok: false,
        message: context.message,
      };
    }

    const estate = await getDeveloperEstateById(context.adminSupabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
    });

    if (!estate) {
      return {
        ok: false,
        message: "Estate was not found for this developer account.",
      };
    }

    const sessionSupabase = await createSupabaseServerClient();

    await assignDeveloperBuyerToPlot(sessionSupabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
      plotId: parsed.plotId,
      buyerId: parsed.buyerId,
      assignmentNote: nullableText(parsed.assignmentNote),
    });

    revalidatePath(`/developer/estates/${parsed.estateId}`);
    revalidatePath("/developer/buyers");

    return {
      ok: true,
      message: "Buyer assigned to plot successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
