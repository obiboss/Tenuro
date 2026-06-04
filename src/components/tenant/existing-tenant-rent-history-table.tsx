"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  buildRentCycles,
  calculateArrearsFromCycles,
  getCycleBalance,
  getCycleStatus,
  getDefaultArrearsStartDate,
  type ExistingTenantRentCycle,
  type RentCycleStatus,
} from "@/lib/existing-tenant-arrears";
import type {
  ExistingTenantClaimDetailRow,
  ExistingTenantClaimPaymentFrequency,
} from "@/server/repositories/existing-tenant-claims.repository";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantRentHistoryTableProps = {
  claim: ExistingTenantClaimDetailRow;
  cycles: ExistingTenantRentCycle[];
  arrearsStartDate: string;
  onArrearsStartDateChange: (value: string) => void;
  onCyclesChange: (cycles: ExistingTenantRentCycle[]) => void;
  disabled?: boolean;
};

const inputClassName =
  "flex h-11 min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-base font-medium text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted";

const statusCopy: Record<
  Exclude<RentCycleStatus, "assumed_paid">,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  fully_paid: { label: "Fully paid", tone: "success" },
  part_paid: { label: "Part paid", tone: "warning" },
  not_paid: { label: "Not paid", tone: "danger" },
};

function getYearOptions(moveInDate: string, paymentFrequency: ExistingTenantClaimPaymentFrequency) {
  const cycles = buildRentCycles({
    moveInDate,
    paymentFrequency,
    defaultRentAmount: 0,
    arrearsStartDate: moveInDate,
  });

  const years = new Set<number>();

  for (const cycle of cycles) {
    years.add(new Date(`${cycle.periodStart}T00:00:00`).getFullYear());
  }

  return [...years].sort((first, second) => second - first);
}

function cycleMatchesStartYear(cycle: ExistingTenantRentCycle, startYear: number) {
  return new Date(`${cycle.periodStart}T00:00:00`).getFullYear() >= startYear;
}

function createPaymentRow() {
  return {
    amount: "",
    paidAt: "",
    note: "",
    id: crypto.randomUUID(),
  };
}

function PaymentRowsEditor({
  cycle,
  disabled,
  onChange,
}: {
  cycle: ExistingTenantRentCycle;
  disabled?: boolean;
  onChange: (payments: ExistingTenantRentCycle["payments"]) => void;
}) {
  const rows =
    cycle.payments.length > 0
      ? cycle.payments.map((payment, index) => ({
          id: `${cycle.id}-payment-${index}`,
          amount: String(payment.amount ?? ""),
          paidAt: payment.paidAt,
          note: payment.note ?? "",
        }))
      : [createPaymentRow()];

  function updatePayment(
    rowId: string,
    field: "amount" | "paidAt" | "note",
    value: string,
  ) {
    const nextRows = rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            [field]: value,
          }
        : row,
    );

    onChange(
      nextRows
        .filter((row) => Number(row.amount) > 0 && row.paidAt)
        .map((row) => ({
          amount: Number(row.amount),
          paidAt: row.paidAt,
          note: row.note,
        })),
    );
  }

  function addPaymentRow() {
    onChange([
      ...cycle.payments,
      {
        amount: 0,
        paidAt: "",
        note: "",
      },
    ]);
  }

  function removePaymentRow(rowId: string) {
    const nextRows = rows.filter((row) => row.id !== rowId);

    onChange(
      nextRows
        .filter((row) => Number(row.amount) > 0 && row.paidAt)
        .map((row) => ({
          amount: Number(row.amount),
          paidAt: row.paidAt,
          note: row.note,
        })),
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 rounded-button border border-border-soft bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <CurrencyInput
            label={`Amount paid ${index + 1}`}
            name={`${cycle.id}-amount-${index}`}
            value={row.amount}
            onValueChange={(value) => updatePayment(row.id, "amount", value)}
            disabled={disabled}
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-strong">
              Payment date
            </label>
            <input
              type="date"
              value={row.paidAt}
              disabled={disabled}
              onChange={(event) =>
                updatePayment(row.id, "paidAt", event.target.value)
              }
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-strong">
              Note/reference
            </label>
            <input
              type="text"
              value={row.note}
              placeholder="Optional"
              disabled={disabled}
              onChange={(event) =>
                updatePayment(row.id, "note", event.target.value)
              }
              className={inputClassName}
            />
          </div>

          <button
            type="button"
            aria-label="Remove payment"
            disabled={disabled || rows.length === 1}
            onClick={() => removePaymentRow(row.id)}
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-button px-3 text-danger transition hover:bg-danger-soft disabled:opacity-40"
          >
            <Trash2 size={16} strokeWidth={2.4} />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={addPaymentRow}
        disabled={disabled}
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={16} strokeWidth={2.4} />
          Add payment
        </span>
      </Button>
    </div>
  );
}

function CycleStatusBadge({ status }: { status: RentCycleStatus }) {
  if (status === "assumed_paid") {
    return <Badge tone="neutral">Assumed paid</Badge>;
  }

  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

export function ExistingTenantRentHistoryTable({
  claim,
  cycles,
  arrearsStartDate,
  onArrearsStartDateChange,
  onCyclesChange,
  disabled = false,
}: ExistingTenantRentHistoryTableProps) {
  const [showAssumedPaid, setShowAssumedPaid] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  const moveInDate = claim.tenant_move_in_date ?? "";
  const rentAmount = Number(claim.tenant_claimed_rent_amount ?? 0);
  const paymentFrequency = claim.tenant_payment_frequency;

  const yearOptions = useMemo(
    () => getYearOptions(moveInDate, paymentFrequency),
    [moveInDate, paymentFrequency],
  );

  const selectedStartYear = new Date(`${arrearsStartDate}T00:00:00`).getFullYear();

  const summary = useMemo(
    () =>
      calculateArrearsFromCycles({
        moveInDate,
        paymentFrequency,
        arrearsStartDate,
        cycles,
      }),
    [arrearsStartDate, cycles, moveInDate, paymentFrequency],
  );

  const assumedPaidCycles = cycles.filter((cycle) => cycle.assumedPaid);
  const activeCycles = cycles.filter((cycle) => !cycle.assumedPaid);

  function handleStartYearChange(year: number) {
    const matchingCycle = cycles.find(
      (cycle) =>
        new Date(`${cycle.periodStart}T00:00:00`).getFullYear() === year,
    );

    if (!matchingCycle) {
      return;
    }

    onArrearsStartDateChange(matchingCycle.periodStart);

    const rebuilt = buildRentCycles({
      moveInDate,
      paymentFrequency,
      defaultRentAmount: rentAmount,
      arrearsStartDate: matchingCycle.periodStart,
      savedCycles: cycles,
    });

    onCyclesChange(rebuilt);
  }

  function updateCycle(
    cycleId: string,
    updater: (cycle: ExistingTenantRentCycle) => ExistingTenantRentCycle,
  ) {
    onCyclesChange(cycles.map((cycle) => (cycle.id === cycleId ? updater(cycle) : cycle)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border-soft bg-white p-4">
        <label className="block text-sm font-semibold text-text-strong">
          Record arrears from
        </label>
        <select
          value={selectedStartYear}
          disabled={disabled || yearOptions.length === 0}
          onChange={(event) => handleStartYearChange(Number(event.target.value))}
          className={`${inputClassName} mt-2`}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Earlier years are assumed fully paid. Adjust rent charged per year if
          the amount changed.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-card border border-border-soft md:block">
        <table className="w-full border-collapse bg-white text-sm">
          <thead className="bg-background text-left text-xs font-black uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Rent charged</th>
              <th className="px-4 py-3">Payments</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {activeCycles.map((cycle) => {
              const balance = getCycleBalance(cycle);
              const status = getCycleStatus(cycle);
              const paymentsTotal = cycle.payments.reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0,
              );

              return (
                <tr key={cycle.id} className="align-top">
                  <td className="px-4 py-4 font-bold text-text-strong">
                    {cycle.label}
                  </td>
                  <td className="px-4 py-4">
                    <CurrencyInput
                      label="Rent charged"
                      name={`rent-${cycle.id}`}
                      value={String(cycle.rentCharged)}
                      onValueChange={(value) =>
                        updateCycle(cycle.id, (current) => ({
                          ...current,
                          rentCharged: Number(value || 0),
                        }))
                      }
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <PaymentRowsEditor
                      cycle={cycle}
                      disabled={disabled}
                      onChange={(payments) =>
                        updateCycle(cycle.id, (current) => ({
                          ...current,
                          payments,
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-4 text-base font-black text-text-strong">
                    {formatNaira(balance)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <CycleStatusBadge status={status} />
                      <p className="text-xs font-semibold text-text-muted">
                        Paid {formatNaira(paymentsTotal)}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {activeCycles.map((cycle) => {
          const balance = getCycleBalance(cycle);
          const status = getCycleStatus(cycle);
          const isExpanded = expandedCycleId === cycle.id;
          const paymentsTotal = cycle.payments.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0,
          );

          return (
            <article
              key={cycle.id}
              className="rounded-card border border-border-soft bg-white"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                onClick={() =>
                  setExpandedCycleId(isExpanded ? null : cycle.id)
                }
              >
                <div>
                  <p className="font-black text-text-strong">{cycle.label}</p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Balance {formatNaira(balance)} · Paid{" "}
                    {formatNaira(paymentsTotal)}
                  </p>
                </div>
                <CycleStatusBadge status={status} />
              </button>

              {isExpanded ? (
                <div className="space-y-4 border-t border-border-soft p-4">
                  <CurrencyInput
                    label="Rent charged"
                    name={`mobile-rent-${cycle.id}`}
                    value={String(cycle.rentCharged)}
                    onValueChange={(value) =>
                      updateCycle(cycle.id, (current) => ({
                        ...current,
                        rentCharged: Number(value || 0),
                      }))
                    }
                    disabled={disabled}
                  />
                  <PaymentRowsEditor
                    cycle={cycle}
                    disabled={disabled}
                    onChange={(payments) =>
                      updateCycle(cycle.id, (current) => ({
                        ...current,
                        payments,
                      }))
                    }
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {assumedPaidCycles.length > 0 ? (
        <div className="rounded-card border border-border-soft bg-background p-4">
          <button
            type="button"
            className="text-sm font-extrabold text-primary"
            onClick={() => setShowAssumedPaid((current) => !current)}
          >
            {showAssumedPaid
              ? "Hide previous years (assumed paid)"
              : "Show previous years (assumed paid)"}
          </button>

          {showAssumedPaid ? (
            <div className="mt-3 space-y-2">
              {assumedPaidCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between rounded-button bg-white/70 px-4 py-3 text-sm text-text-muted"
                >
                  <span className="font-bold">{cycle.label}</span>
                  <CycleStatusBadge status="assumed_paid" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-card border border-border-soft bg-background p-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total charged
          </p>
          <p className="mt-2 text-base font-black text-text-strong">
            {formatNaira(summary.totalRentDue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total paid
          </p>
          <p className="mt-2 text-base font-black text-text-strong">
            {formatNaira(summary.totalPaymentsCounted)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-danger">
            Amount owed
          </p>
          <p className="mt-2 text-base font-black text-danger">
            {formatNaira(summary.amountOwed)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function buildInitialRentCyclesForClaim(
  claim: ExistingTenantClaimDetailRow,
): {
  arrearsStartDate: string;
  cycles: ExistingTenantRentCycle[];
} {
  const moveInDate = claim.tenant_move_in_date ?? "";
  const rentAmount = Number(claim.tenant_claimed_rent_amount ?? 0);
  const paymentFrequency = claim.tenant_payment_frequency;
  const metadataCycles = claim.arrears_calculation_metadata?.cycles;

  const arrearsStartDate =
    claim.landlord_arrears_start_date ??
    getDefaultArrearsStartDate({
      moveInDate,
      paymentFrequency,
    });

  const savedCycles = Array.isArray(metadataCycles)
    ? (metadataCycles as ExistingTenantRentCycle[])
    : claim.landlord_payment_history.length > 0
      ? undefined
      : undefined;

  const cycles = buildRentCycles({
    moveInDate,
    paymentFrequency,
    defaultRentAmount: rentAmount,
    arrearsStartDate,
    savedCycles,
  });

  if (
    !Array.isArray(metadataCycles) &&
    claim.landlord_payment_history.length > 0
  ) {
    return {
      arrearsStartDate,
      cycles: cycles.map((cycle) => ({
        ...cycle,
        payments: cycle.assumedPaid
          ? []
          : claim.landlord_payment_history
              .filter((payment) => {
                const paidAt = new Date(`${payment.paidAt}T00:00:00`).getTime();
                const periodStart = new Date(`${cycle.periodStart}T00:00:00`).getTime();
                const periodEnd = new Date(`${cycle.periodEnd}T00:00:00`).getTime();

                return paidAt >= periodStart && paidAt < periodEnd;
              })
              .map((payment) => ({
                amount: Number(payment.amount),
                paidAt: payment.paidAt,
                note: payment.note,
              })),
      })),
    };
  }

  return { arrearsStartDate, cycles };
}
