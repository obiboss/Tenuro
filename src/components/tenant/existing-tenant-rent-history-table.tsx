"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  buildRentCycles,
  getCycleBalance,
  getCycleStatus,
  normalizeRentCycleAfterEdit,
  startRecordingCycleArrears,
  type ExistingTenantRentCycle,
  type RentCycleStatus,
} from "@/lib/existing-tenant-arrears";
import type { ExistingTenantClaimDetailRow } from "@/server/repositories/existing-tenant-claims.repository";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantRentHistoryTableProps = {
  cycles: ExistingTenantRentCycle[];
  confirmedRentAmount: number;
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

function createEmptyPaymentRow() {
  return {
    amount: 0,
    paidAt: "",
    note: "",
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
    cycle.payments.length > 0 ? cycle.payments : [createEmptyPaymentRow()];

  function updatePayments(nextRows: ExistingTenantRentCycle["payments"]) {
    onChange(nextRows);
  }

  return (
    <div className="space-y-3">
      {rows.map((payment, index) => (
        <div
          key={`${cycle.id}-payment-${index}`}
          className="grid gap-3 rounded-button border border-border-soft bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <CurrencyInput
            label={`Amount paid ${index + 1}`}
            name={`${cycle.id}-amount-${index}`}
            value={payment.amount > 0 ? String(payment.amount) : ""}
            onValueChange={(value) => {
              const nextRows = rows.map((row, rowIndex) =>
                rowIndex === index
                  ? { ...row, amount: Number(value || 0) }
                  : row,
              );
              updatePayments(nextRows);
            }}
            disabled={disabled}
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-strong">
              Payment date
            </label>
            <input
              type="date"
              value={payment.paidAt}
              disabled={disabled}
              onChange={(event) => {
                const nextRows = rows.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, paidAt: event.target.value }
                    : row,
                );
                updatePayments(nextRows);
              }}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-strong">
              Note/reference
            </label>
            <input
              type="text"
              value={payment.note ?? ""}
              placeholder="Optional"
              disabled={disabled}
              onChange={(event) => {
                const nextRows = rows.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, note: event.target.value }
                    : row,
                );
                updatePayments(nextRows);
              }}
              className={inputClassName}
            />
          </div>

          <button
            type="button"
            aria-label="Remove payment"
            disabled={disabled || rows.length === 1}
            onClick={() => {
              const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
              updatePayments(nextRows.length > 0 ? nextRows : []);
            }}
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-button px-3 text-danger transition hover:bg-danger-soft disabled:opacity-40"
          >
            <Trash2 size={16} strokeWidth={2.4} />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...cycle.payments, createEmptyPaymentRow()])}
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
    return <Badge tone="success">Assumed paid</Badge>;
  }

  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

function CycleRow({
  cycle,
  confirmedRentAmount,
  disabled,
  onChange,
}: {
  cycle: ExistingTenantRentCycle;
  confirmedRentAmount: number;
  disabled?: boolean;
  onChange: (cycle: ExistingTenantRentCycle) => void;
}) {
  const isRecording = !cycle.assumedPaid;
  const status = getCycleStatus(cycle);
  const balance = isRecording ? getCycleBalance(cycle) : 0;

  function applyCycleUpdate(updater: (current: ExistingTenantRentCycle) => ExistingTenantRentCycle) {
    onChange(normalizeRentCycleAfterEdit(updater(cycle)));
  }

  if (!isRecording) {
    return (
      <article className="flex flex-col gap-3 rounded-card border border-border-soft bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-black text-text-strong">{cycle.label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CycleStatusBadge status="assumed_paid" />
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              applyCycleUpdate((current) =>
                startRecordingCycleArrears(current, confirmedRentAmount),
              )
            }
            className="min-h-11 text-sm font-extrabold text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            Record arrears
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="space-y-4 rounded-card border border-primary/20 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-text-strong">{cycle.label}</p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            Balance {formatNaira(balance)}
          </p>
        </div>
        <CycleStatusBadge status={status} />
      </div>

      <CurrencyInput
        label="Rent charged"
        name={`rent-${cycle.id}`}
        value={cycle.rentCharged > 0 ? String(cycle.rentCharged) : ""}
        onValueChange={(value) =>
          applyCycleUpdate((current) => ({
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
          applyCycleUpdate((current) => ({
            ...current,
            payments,
          }))
        }
      />
    </article>
  );
}

export function ExistingTenantRentHistoryTable({
  cycles,
  confirmedRentAmount,
  onCyclesChange,
  disabled = false,
}: ExistingTenantRentHistoryTableProps) {
  function updateCycle(
    cycleId: string,
    updater: (cycle: ExistingTenantRentCycle) => ExistingTenantRentCycle,
  ) {
    onCyclesChange(
      cycles.map((cycle) =>
        cycle.id === cycleId ? normalizeRentCycleAfterEdit(updater(cycle)) : cycle,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base leading-7 text-text-muted">
        Every rent year is assumed fully paid unless you record arrears for that
        year. You can approve with no changes if the tenant does not owe anything.
      </p>

      <div className="space-y-3">
        {cycles.map((cycle) => (
          <CycleRow
            key={cycle.id}
            cycle={cycle}
            confirmedRentAmount={confirmedRentAmount}
            disabled={disabled}
            onChange={(updatedCycle) => updateCycle(cycle.id, () => updatedCycle)}
          />
        ))}
      </div>
    </div>
  );
}

export function buildInitialRentCyclesForClaim(
  claim: ExistingTenantClaimDetailRow,
): {
  cycles: ExistingTenantRentCycle[];
} {
  const moveInDate = claim.tenant_move_in_date ?? "";
  const paymentFrequency = claim.tenant_payment_frequency;
  const metadataCycles = claim.arrears_calculation_metadata?.cycles;

  if (Array.isArray(metadataCycles)) {
    return {
      cycles: buildRentCycles({
        moveInDate,
        paymentFrequency,
        savedCycles: metadataCycles as ExistingTenantRentCycle[],
      }),
    };
  }

  if (claim.landlord_payment_history.length > 0 && moveInDate) {
    const baseCycles = buildRentCycles({
      moveInDate,
      paymentFrequency,
    });

    return {
      cycles: baseCycles.map((cycle) => {
        const payments = claim.landlord_payment_history
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
          }));

        if (payments.length === 0) {
          return cycle;
        }

        return {
          ...cycle,
          assumedPaid: false,
          rentCharged: Number(claim.tenant_claimed_rent_amount ?? 0),
          payments,
        };
      }),
    };
  }

  return {
    cycles: buildRentCycles({
      moveInDate,
      paymentFrequency,
    }),
  };
}
