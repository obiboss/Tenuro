"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  confirmManagerImportAction,
  previewManagerImportAction,
} from "@/actions/manager-import.actions";
import type {
  ManagerImportPreviewState,
  ManagerImportResult,
  ManagerImportRow,
} from "@/lib/manager-import";

const initialPreview: ManagerImportPreviewState = {
  ok: false,
  message: "",
};

const initialResult: ManagerImportResult = {
  ok: false,
  message: "",
  created: {
    landlords: 0,
    properties: 0,
    units: 0,
    tenants: 0,
    payments: 0,
  },
  reused: 0,
  skippedPayments: 0,
  issues: [],
};

function countUnique(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase())).size;
}

function rowsSignature(rows: ManagerImportRow[]) {
  const value = JSON.stringify(rows);
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return `${rows.length}-${hash}`;
}

function ManagerImportSubmit({ rows }: { rows: ManagerImportRow[] }) {
  const [result, importAction, isImporting] = useActionState(
    confirmManagerImportAction,
    initialResult,
  );
  const hasResult = Boolean(result.message);

  return (
    <>
      {!hasResult ? (
        <form action={importAction} className="mt-5">
          <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
          <button
            type="submit"
            disabled={isImporting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isImporting
              ? "Importing records…"
              : `Import ${rows.length} checked rows`}
          </button>
        </form>
      ) : null}

      {hasResult ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            result.ok
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-black text-text-strong">{result.message}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                Created: {result.created.landlords} landlords,{" "}
                {result.created.properties} properties, {result.created.units}{" "}
                units, {result.created.tenants} tenants and{" "}
                {result.created.payments} payments.
                {result.skippedPayments > 0
                  ? ` ${result.skippedPayments} duplicate payment${result.skippedPayments === 1 ? " was" : "s were"} skipped.`
                  : ""}
              </p>
            </div>
          </div>

          {result.issues.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-950">
              {result.issues.slice(0, 12).map((issue, index) => (
                <li key={`${issue.rowNumber}-${index}`}>
                  Row {issue.rowNumber}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          {result.ok ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/manager/properties"
                className="font-extrabold text-primary underline underline-offset-4"
              >
                View properties
              </Link>
              <Link
                href="/manager/payments"
                className="font-extrabold text-primary underline underline-offset-4"
              >
                View payments
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ManagerImportWorkspace() {
  const [preview, previewAction, isChecking] = useActionState(
    previewManagerImportAction,
    initialPreview,
  );
  const rows = preview.rows ?? [];
  const issues = preview.issues ?? [];
  const tenantRows = rows.filter((row) => row.tenantName);
  const paymentRows = rows.filter((row) => row.lastPaymentAmount !== null);

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Download className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              Step 1
            </p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Download the BOPA template
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
              Copy existing property, unit, tenant and latest-payment records
              into the template. It includes a sample and clear instructions.
            </p>
            <a
              href="/manager/import/template"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-primary bg-white px-4 text-sm font-extrabold text-primary transition hover:bg-primary-soft"
            >
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Download Excel template
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Upload className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              Step 2
            </p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              Upload and check the file
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              BOPA checks required details before saving anything. Use .xlsx or
              .csv, up to 500 rows and 900 KB.
            </p>

            <form action={previewAction} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-text-strong">
                  Excel file
                </span>
                <input
                  type="file"
                  name="workbook"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  required
                  className="block w-full rounded-xl border border-border-soft bg-surface px-3 py-3 text-sm font-semibold text-text-strong file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-extrabold file:text-primary"
                />
              </label>
              <button
                type="submit"
                disabled={isChecking}
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking ? "Checking file…" : "Check file"}
              </button>
            </form>

            {preview.message ? (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm font-bold leading-6 ${
                  preview.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                {preview.message}
                {preview.fileName ? ` File: ${preview.fileName}.` : ""}
              </div>
            ) : null}

            {issues.length > 0 ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-black text-red-950">Rows to correct</h3>
                <ul className="mt-2 space-y-2 text-sm font-semibold leading-5 text-red-900">
                  {issues.slice(0, 12).map((issue, index) => (
                    <li key={`${issue.rowNumber}-${index}`}>
                      Row {issue.rowNumber}: {issue.message}
                    </li>
                  ))}
                </ul>
                {issues.length > 12 ? (
                  <p className="mt-3 text-sm font-bold text-red-900">
                    Correct these first, then upload again to see any remaining
                    rows.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {preview.ok && rows.length > 0 ? (
        <section className="rounded-card border border-primary/20 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Step 3
              </p>
              <h2 className="mt-1 text-lg font-black text-text-strong">
                Review and import
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Matching landlords, properties, units and tenants are reused.
                Duplicate payments are skipped, not added twice.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  ["Rows", rows.length],
                  [
                    "Landlords",
                    countUnique(rows.map((row) => row.landlordName)),
                  ],
                  [
                    "Properties",
                    countUnique(
                      rows.map(
                        (row) =>
                          `${row.landlordName}|${row.propertyName}|${row.propertyAddress}`,
                      ),
                    ),
                  ],
                  ["Tenants", tenantRows.length],
                  ["Payments", paymentRows.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-surface p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-black text-text-strong">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-border-soft">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3">Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 6).map((row) => (
                      <tr
                        key={row.rowNumber}
                        className="border-t border-border-soft font-semibold text-text-strong"
                      >
                        <td className="px-4 py-3">{row.rowNumber}</td>
                        <td className="px-4 py-3">{row.propertyName}</td>
                        <td className="px-4 py-3">{row.unitLabel}</td>
                        <td className="px-4 py-3">
                          {row.tenantName ?? "Vacant"}
                        </td>
                        <td className="px-4 py-3">
                          ₦{row.rentAmount.toLocaleString("en-NG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 6 ? (
                <p className="mt-2 text-xs font-bold text-text-muted">
                  Showing the first 6 of {rows.length} checked rows.
                </p>
              ) : null}

              <ManagerImportSubmit key={rowsSignature(rows)} rows={rows} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
