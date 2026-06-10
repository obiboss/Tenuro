"use server";

import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import {
  createDeveloperPlot,
  createDeveloperPlotsBulk,
  createDeveloperPlotType,
  listDeveloperPlotsForEstate,
} from "@/server/repositories/developer-plots.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import {
  createBulkDeveloperPlotsSchema,
  createDeveloperPlotSchema,
  createDeveloperPlotTypeSchema,
  type BulkDeveloperPlotNumberingStyle,
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

function getAlphabetLabel(index: number) {
  let value = index;
  let label = "";

  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  }

  return label;
}

function createGeneratedPlotNumber(params: {
  index: number;
  numberingStyle: BulkDeveloperPlotNumberingStyle;
  startingNumber: number;
  labelPrefix: string;
  plotsPerBlock: number;
}) {
  const number = params.startingNumber + params.index;
  const cleanPrefix = params.labelPrefix.trim() || "A";

  if (params.numberingStyle === "prefixed_numeric") {
    return `${cleanPrefix}${number}`;
  }

  if (params.numberingStyle === "block_numeric") {
    const blockIndex = Math.floor(params.index / params.plotsPerBlock);
    const plotNumberInBlock = (params.index % params.plotsPerBlock) + 1;
    const blockLabel = getAlphabetLabel(blockIndex);

    return `Block ${blockLabel} - Plot ${plotNumberInBlock}`;
  }

  return `Plot ${number}`;
}

function createGeneratedPlotNumbers(params: {
  count: number;
  numberingStyle: BulkDeveloperPlotNumberingStyle;
  startingNumber: number;
  labelPrefix: string;
  plotsPerBlock: number;
}) {
  return Array.from({ length: params.count }, (_, index) =>
    createGeneratedPlotNumber({
      index,
      numberingStyle: params.numberingStyle,
      startingNumber: params.startingNumber,
      labelPrefix: params.labelPrefix,
      plotsPerBlock: params.plotsPerBlock,
    }),
  );
}

function normalisePlotNumber(value: string) {
  return value.trim().toLowerCase();
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
      message: "Plot kind saved successfully.",
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

export async function createBulkDeveloperPlotsAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = createBulkDeveloperPlotsSchema.parse({
      estateId: formData.get("estateId"),
      landSize: formData.get("landSize"),
      numberOfPlots: formData.get("numberOfPlots"),
      plotSizeLabel: formData.get("plotSizeLabel"),
      numberingStyle: formData.get("numberingStyle") || "numeric",
      startingNumber: formData.get("startingNumber") || "1",
      labelPrefix: formData.get("labelPrefix"),
      plotsPerBlock: formData.get("plotsPerBlock") || "20",
      pricePerPlot: formData.get("pricePerPlot"),
      note: formData.get("note"),
    });

    const context = await requireDeveloperAccountForEstate(parsed.estateId);

    if (!context.ok || !context.account) {
      return {
        ok: false,
        message: context.message,
      };
    }

    const generatedPlotNumbers = createGeneratedPlotNumbers({
      count: parsed.numberOfPlots,
      numberingStyle: parsed.numberingStyle,
      startingNumber: parsed.startingNumber,
      labelPrefix: parsed.labelPrefix,
      plotsPerBlock: parsed.plotsPerBlock,
    });

    const duplicateInGeneratedList = generatedPlotNumbers.find(
      (plotNumber, index) =>
        generatedPlotNumbers.findIndex(
          (item) =>
            normalisePlotNumber(item) === normalisePlotNumber(plotNumber),
        ) !== index,
    );

    if (duplicateInGeneratedList) {
      return {
        ok: false,
        message:
          "BOPA could not generate unique plot labels. Adjust the numbering style and try again.",
      };
    }

    const existingPlots = await listDeveloperPlotsForEstate(context.supabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
    });

    const existingPlotNumbers = new Set(
      existingPlots.map((plot) => normalisePlotNumber(plot.plot_number)),
    );

    const conflictingPlotNumber = generatedPlotNumbers.find((plotNumber) =>
      existingPlotNumbers.has(normalisePlotNumber(plotNumber)),
    );

    if (conflictingPlotNumber) {
      return {
        ok: false,
        message: `${conflictingPlotNumber} already exists in this estate. Change the starting number or numbering style.`,
      };
    }

    const noteParts = [
      `Generated by BOPA from total land size: ${parsed.landSize}.`,
      parsed.note,
    ].filter(Boolean);

    await createDeveloperPlotsBulk(context.supabase, {
      developerAccountId: context.account.id,
      estateId: parsed.estateId,
      plots: generatedPlotNumbers.map((plotNumber) => ({
        plotNumber,
        sizeLabel: parsed.plotSizeLabel,
        price: parsed.pricePerPlot,
        notes: nullableText(noteParts.join(" ")),
      })),
    });

    revalidatePath(`/developer/estates/${parsed.estateId}`);

    return {
      ok: true,
      message: `${parsed.numberOfPlots} plots created successfully.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
