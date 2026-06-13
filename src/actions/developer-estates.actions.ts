"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createDeveloperEstate } from "@/server/repositories/developer-estates.repository";
import { createDeveloperPlotsBulk } from "@/server/repositories/developer-plots.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import {
  createDeveloperEstateSchema,
  type EstatePlotNumberingStyle,
} from "@/server/validators/developer-estate.schema";

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
  numberingStyle: EstatePlotNumberingStyle;
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
  numberingStyle: EstatePlotNumberingStyle;
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

async function deleteCreatedEstateAfterPlotFailure(params: {
  estateId: string;
  developerAccountId: string;
}) {
  const supabase = createSupabaseAdminClient();

  await supabase
    .from("developer_estates")
    .delete()
    .eq("id", params.estateId)
    .eq("developer_account_id", params.developerAccountId);
}

export async function createDeveloperEstateAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let estateId: string | null = null;
  let developerAccountId: string | null = null;

  try {
    const developer = await requireDeveloper();

    const parsed = createDeveloperEstateSchema.parse({
      estateName: formData.get("estateName"),
      location: formData.get("location"),
      city: formData.get("city"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      description: formData.get("description"),
      status: formData.get("status") || "planning",
      initialPaymentPercentage: formData.get("initialPaymentPercentage"),
      balanceSpreadMonths: formData.get("balanceSpreadMonths"),
      landSize: formData.get("landSize"),
      numberOfPlots: formData.get("numberOfPlots"),
      plotSizeLabel: formData.get("plotSizeLabel"),
      pricePerPlot: formData.get("pricePerPlot"),
      numberingStyle: formData.get("numberingStyle") || "numeric",
      startingNumber: formData.get("startingNumber") || "1",
      labelPrefix: formData.get("labelPrefix"),
      plotsPerBlock: formData.get("plotsPerBlock") || "20",
      plotNote: formData.get("plotNote"),
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

    developerAccountId = account.id;

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

    const defaultPaymentPlanMode =
      parsed.initialPaymentPercentage >= 100 ? "outright" : "fixed_installment";

    const estate = await createDeveloperEstate(supabase, {
      developerAccountId: account.id,
      estateName: parsed.estateName,
      location: parsed.location,
      city: nullableText(parsed.city),
      state: parsed.state,
      lga: parsed.lga,
      description: nullableText(parsed.description),
      status: parsed.status,
      initialPaymentPercentage: Number(
        parsed.initialPaymentPercentage.toFixed(2),
      ),
      balanceSpreadMonths:
        parsed.initialPaymentPercentage >= 100 ? 0 : parsed.balanceSpreadMonths,
      installmentInterval: "monthly",
      defaultPaymentPlanMode,
    });

    estateId = estate.id;

    const plotNoteParts = [
      `Generated by BOPA from total land size: ${parsed.landSize}.`,
      parsed.plotNote,
    ].filter(Boolean);

    const insertedCount = await createDeveloperPlotsBulk(supabase, {
      developerAccountId: account.id,
      estateId: estate.id,
      plots: generatedPlotNumbers.map((plotNumber) => ({
        plotNumber,
        sizeLabel: parsed.plotSizeLabel,
        price: parsed.pricePerPlot,
        notes: nullableText(plotNoteParts.join(" ")),
      })),
    });

    if (insertedCount !== parsed.numberOfPlots) {
      await deleteCreatedEstateAfterPlotFailure({
        estateId: estate.id,
        developerAccountId: account.id,
      });

      estateId = null;

      return {
        ok: false,
        message:
          "BOPA could not create all plots. Please try again before using this estate.",
      };
    }
  } catch (error) {
    if (estateId && developerAccountId) {
      await deleteCreatedEstateAfterPlotFailure({
        estateId,
        developerAccountId,
      });
    }

    return toActionError(error);
  }

  revalidatePath("/developer/estates");

  if (estateId) {
    redirect(`/developer/estates/${estateId}`);
  }

  return {
    ok: true,
    message: "Estate and plots created successfully.",
  };
}
