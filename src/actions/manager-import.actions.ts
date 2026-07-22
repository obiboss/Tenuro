"use server";

import { revalidatePath } from "next/cache";
import {
  type ManagerImportPreviewState,
  type ManagerImportResult,
} from "@/lib/manager-import";
import { parseManagerImportWorkbook } from "@/server/import/manager-excel-import";
import { importManagerRows } from "@/server/services/manager-import.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";

function actionError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "BOPA could not process the spreadsheet. Check the file and try again.";
}

export async function previewManagerImportAction(
  _previousState: ManagerImportPreviewState,
  formData: FormData,
): Promise<ManagerImportPreviewState> {
  try {
    await requireManagerWorkspacePermission("records.import");

    const file = formData.get("workbook");
    if (!(file instanceof File)) {
      return { ok: false, message: "Choose an Excel file to continue." };
    }

    const preview = await parseManagerImportWorkbook(file);

    return {
      ok: preview.issues.length === 0 && preview.rows.length > 0,
      message:
        preview.issues.length === 0
          ? `${preview.rows.length} row${preview.rows.length === 1 ? " is" : "s are"} ready to import.`
          : "Some spreadsheet rows need attention before import.",
      fileName: file.name,
      rows: preview.rows,
      issues: preview.issues,
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

const emptyCreated = {
  landlords: 0,
  properties: 0,
  units: 0,
  tenants: 0,
  payments: 0,
};

export async function confirmManagerImportAction(
  _previousState: ManagerImportResult,
  formData: FormData,
): Promise<ManagerImportResult> {
  try {
    const value = formData.get("rowsJson");
    const rows = typeof value === "string" ? JSON.parse(value) : [];
    const result = await importManagerRows(rows);

    revalidatePath("/manager/overview");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/payments");
    revalidatePath("/manager/reports");

    return result;
  } catch (error) {
    return {
      ok: false,
      message: actionError(error),
      created: emptyCreated,
      reused: 0,
      skippedPayments: 0,
      issues: [],
    };
  }
}
