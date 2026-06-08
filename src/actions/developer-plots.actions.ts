"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import {
  createDeveloperPlot,
  createDeveloperPlotType,
} from "@/server/repositories/developer-plots.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import {
  createDeveloperPlotSchema,
  createDeveloperPlotTypeSchema,
} from "@/server/validators/developer-plot.schema";

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

async function requireDeveloperAccountForEstate(estateId: string) {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account || account.status !== "active") {
    return {
      ok: false as const,
      message: "Developer account is not active.",
      supabase,
      account: null,
      estate: null,
    };
  }

  const estate = await getDeveloperEstateById(supabase, {
    developerAccountId: account.id,
    estateId,
  });

  if (!estate) {
    return {
      ok: false as const,
      message: "Estate was not found for this developer account.",
      supabase,
      account,
      estate: null,
    };
  }

  return {
    ok: true as const,
    message: "",
    supabase,
    account,
    estate,
  };
}

export async function createDeveloperPlotTypeAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = createDeveloperPlotTypeSchema.parse({
      estateId: formData.get("estateId"),
      typeName: formData.get("typeName"),
      sizeLabel: formData.get("sizeLabel"),
      defaultPrice: formData.get("defaultPrice"),
      description: formData.get("description"),
    });

    const context = await requireDeveloperAccountForEstate(parsed.estateId);

    if (!context.ok || !context.account) {
      return {
        ok: false,
        message: context.message,
      };
    }

    await createDeveloperPlotType(context.supabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
      typeName: parsed.typeName,
      sizeLabel: parsed.sizeLabel,
      defaultPrice: parsed.defaultPrice,
      description: nullableText(parsed.description),
    });

    revalidatePath(`/developer/estates/${parsed.estateId}`);

    return {
      ok: true,
      message: "Plot type added successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDeveloperPlotAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = createDeveloperPlotSchema.parse({
      estateId: formData.get("estateId"),
      plotTypeId: formData.get("plotTypeId"),
      plotNumber: formData.get("plotNumber"),
      sizeLabel: formData.get("sizeLabel"),
      price: formData.get("price"),
      status: formData.get("status") || "available",
      notes: formData.get("notes"),
    });

    const context = await requireDeveloperAccountForEstate(parsed.estateId);

    if (!context.ok || !context.account) {
      return {
        ok: false,
        message: context.message,
      };
    }

    await createDeveloperPlot(context.supabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
      plotTypeId: nullableText(parsed.plotTypeId),
      plotNumber: parsed.plotNumber,
      sizeLabel: parsed.sizeLabel,
      price: parsed.price,
      status: parsed.status,
      notes: nullableText(parsed.notes),
    });

    revalidatePath(`/developer/estates/${parsed.estateId}`);

    return {
      ok: true,
      message: "Plot added successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
