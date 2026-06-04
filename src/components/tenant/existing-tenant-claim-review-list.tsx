"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Home,
  Plus,
  Trash2,
} from "lucide-react";
import {
  approveExistingTenantClaimAction,
  rejectExistingTenantClaimAction,
  updateExistingTenantClaimArrearsAction,
} from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExistingTenantClaimDetailRow,
  ExistingTenantClaimIdType,
  ExistingTenantClaimPaymentFrequency,
  ExistingTenantClaimStatus,
} from "@/server/repositories/existing-tenant-claims.repository";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantClaimReviewListProps = {
  claims: ExistingTenantClaimDetailRow[];
};

type PaymentHistoryDraft = {
  id: string;
  amount: string;
  paidAt: string;
  note: string;
};

type LiveArrearsPreview = {
  arrearsStartDate: string;
  currentDueDate: string;
  paymentsCounted: number;
  totalPaymentsCounted: number;
  totalRentDue: number;
  outstandingBalance: number;
  monthsOwed: number;
};

const statusCopy: Record<
  ExistingTenantClaimStatus,
  {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral" | "primary";
  }
> = {
  pending: {
    label: "Link Sent",
    tone: "neutral",
  },
  submitted: {
    label: "Needs Review",
    tone: "warning",
  },
  approved: {
    label: "Approved",
    tone: "success",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
  },
  expired: {
    label: "Expired",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
  },
};

const idTypeLabels: Record<ExistingTenantClaimIdType, string> = {
  nin: "NIN",
  passport: "International Passport",
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
};

const inputClassName =
  "flex h-14 w-full rounded-button border border-border-soft bg-white px-4 text-base font-medium text-text-strong outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted";

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

function getFrequencyMonths(frequency: ExistingTenantClaimPaymentFrequency) {
  if (frequency === "monthly") {
    return 1;
  }

  if (frequency === "quarterly") {
    return 3;
  }

  if (frequency === "biannual") {
    return 6;
  }

  return 12;
}

function calculateCurrentDueDateFromMoveIn(
  moveInDate: string | null,
  paymentFrequency: ExistingTenantClaimPaymentFrequency,
) {
  if (!moveInDate) {
    return "";
  }

  const frequencyMonths = getFrequencyMonths(paymentFrequency);
  const today = new Date();
  let currentDueDate = addMonths(parseDateOnly(moveInDate), frequencyMonths);
  let nextDueDate = addMonths(currentDueDate, frequencyMonths);

  while (nextDueDate.getTime() <= today.getTime()) {
    currentDueDate = nextDueDate;
    nextDueDate = addMonths(currentDueDate, frequencyMonths);
  }

  return toDateOnly(currentDueDate);
}

function getDefaultArrearsStartDate(claim: ExistingTenantClaimDetailRow) {
  return (
    claim.landlord_arrears_start_date ??
    claim.bopa_calculated_current_due_date ??
    calculateCurrentDueDateFromMoveIn(
      claim.tenant_move_in_date,
      claim.tenant_payment_frequency,
    )
  );
}

function createPaymentRow(
  payment?: {
    amount: number | string;
    paidAt: string;
    note?: string;
  },
  index = 0,
): PaymentHistoryDraft {
  return {
    id: `${payment?.paidAt ?? "payment"}-${index}-${crypto.randomUUID()}`,
    amount:
      payment?.amount === null || payment?.amount === undefined
        ? ""
        : String(payment.amount),
    paidAt: payment?.paidAt ?? "",
    note: payment?.note ?? "",
  };
}

function calculateLiveArrearsPreview(params: {
  moveInDate: string | null;
  arrearsStartDate: string;
  rentAmount: number;
  paymentFrequency: ExistingTenantClaimPaymentFrequency;
  paymentRows: PaymentHistoryDraft[];
}): LiveArrearsPreview {
  if (
    !params.moveInDate ||
    !params.arrearsStartDate ||
    params.rentAmount <= 0
  ) {
    return {
      arrearsStartDate: params.arrearsStartDate,
      currentDueDate: params.arrearsStartDate,
      paymentsCounted: 0,
      totalPaymentsCounted: 0,
      totalRentDue: 0,
      outstandingBalance: 0,
      monthsOwed: 0,
    };
  }

  const today = new Date();
  const frequencyMonths = getFrequencyMonths(params.paymentFrequency);
  const arrearsStartDate = parseDateOnly(params.arrearsStartDate);
  let dueDate = addMonths(parseDateOnly(params.moveInDate), frequencyMonths);
  let totalRentDue = 0;
  let currentDueDate = params.arrearsStartDate;

  while (dueDate.getTime() <= today.getTime()) {
    if (dueDate.getTime() >= arrearsStartDate.getTime()) {
      totalRentDue += params.rentAmount;
    }

    currentDueDate = toDateOnly(dueDate);
    dueDate = addMonths(dueDate, frequencyMonths);
  }

  const countedPayments = params.paymentRows
    .map((payment) => ({
      amount: Number(payment.amount || 0),
      paidAt: payment.paidAt,
    }))
    .filter(
      (payment) =>
        payment.amount > 0 &&
        payment.paidAt.length > 0 &&
        parseDateOnly(payment.paidAt).getTime() >= arrearsStartDate.getTime(),
    );

  const totalPaymentsCounted = countedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );

  const outstandingBalance = Math.max(totalRentDue - totalPaymentsCounted, 0);
  const monthsOwed =
    outstandingBalance <= 0
      ? 0
      : Math.ceil((outstandingBalance / params.rentAmount) * frequencyMonths);

  return {
    arrearsStartDate: params.arrearsStartDate,
    currentDueDate,
    paymentsCounted: countedPayments.length,
    totalPaymentsCounted,
    totalRentDue,
    outstandingBalance,
    monthsOwed,
  };
}

function getTenantName(claim: ExistingTenantClaimDetailRow) {
  return claim.tenant_full_name ?? claim.invited_tenant_full_name ?? "Tenant";
}

function getTenantPhone(claim: ExistingTenantClaimDetailRow) {
  return (
    claim.tenant_phone_number ??
    claim.invited_tenant_phone_number ??
    "No phone number"
  );
}

function getPropertyUnitLabel(claim: ExistingTenantClaimDetailRow) {
  const propertyName = claim.units?.properties?.property_name ?? "Property";
  const buildingName = claim.units?.building_name;
  const unitIdentifier = claim.units?.unit_identifier ?? "Unit";

  return `${propertyName} · ${
    buildingName ? `${buildingName} · ` : ""
  }${unitIdentifier}`;
}

function getIdTypeLabel(value: ExistingTenantClaimIdType | null) {
  return value ? idTypeLabels[value] : "Not provided";
}

function getBopaDueDate(claim: ExistingTenantClaimDetailRow) {
  return (
    claim.landlord_confirmed_current_due_date ??
    claim.bopa_calculated_current_due_date
  );
}

function ExistingTenantClaimStatusBadge({
  status,
}: {
  status: ExistingTenantClaimStatus;
}) {
  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

function RejectExistingTenantClaimForm({
  claimId,
  disabled,
}: {
  claimId: string;
  disabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    rejectExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Claim rejected"
        errorTitle="Could not reject claim"
      />

      <input type="hidden" name="claimId" value={claimId} />

      <Textarea
        label="Rejection reason"
        name="reason"
        placeholder="Example: The tenant submitted incorrect details."
        error={state.fieldErrors?.reason?.[0]}
      />

      <Button
        type="submit"
        variant="secondary"
        isLoading={isPending}
        disabled={disabled}
        fullWidth
      >
        Reject Claim
      </Button>
    </form>
  );
}

function PaymentHistoryRows({
  rows,
  setRows,
  disabled,
}: {
  rows: PaymentHistoryDraft[];
  setRows: Dispatch<SetStateAction<PaymentHistoryDraft[]>>;
  disabled: boolean;
}) {
  function addRow() {
    setRows((currentRows) => [...currentRows, createPaymentRow()]);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  }

  function updateRow(
    rowId: string,
    field: keyof Omit<PaymentHistoryDraft, "id">,
    value: string,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-card border border-border-soft bg-background p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-text-strong">
              Payment {index + 1}
            </p>

            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={disabled || rows.length === 1}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 aria-hidden="true" size={14} strokeWidth={2.6} />
              Remove
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <CurrencyInput
              label="Amount paid"
              name="paymentAmount"
              value={row.amount}
              onValueChange={(value) => updateRow(row.id, "amount", value)}
              required
              disabled={disabled}
            />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-strong">
                Payment date <span className="text-danger">*</span>
              </label>
              <input
                name="paymentDate"
                type="date"
                value={row.paidAt}
                required
                disabled={disabled}
                onChange={(event) =>
                  updateRow(row.id, "paidAt", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-strong">
                Note/reference
              </label>
              <input
                name="paymentNote"
                type="text"
                value={row.note}
                placeholder="Optional"
                disabled={disabled}
                onChange={(event) =>
                  updateRow(row.id, "note", event.target.value)
                }
                className={inputClassName}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={addRow}
        disabled={disabled || rows.length >= 12}
        fullWidth
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Plus aria-hidden="true" size={18} strokeWidth={2.6} />
          Add Payment
        </span>
      </Button>
    </div>
  );
}

function ArrearsPreviewCards({ preview }: { preview: LiveArrearsPreview }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Rent Due
        </p>
        <p className="mt-2 font-extrabold text-text-strong">
          {formatNaira(preview.totalRentDue)}
        </p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Payments
        </p>
        <p className="mt-2 font-extrabold text-text-strong">
          {formatNaira(preview.totalPaymentsCounted)}
        </p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Months Owed
        </p>
        <p className="mt-2 font-extrabold text-text-strong">
          {preview.monthsOwed}
        </p>
      </div>

      <div className="rounded-button bg-warning-soft p-4">
        <p className="text-xs font-black uppercase tracking-wide text-warning">
          Outstanding
        </p>
        <p className="mt-2 font-black text-warning">
          {formatNaira(preview.outstandingBalance)}
        </p>
      </div>
    </div>
  );
}

function ArrearsEstimateForm({
  claim,
}: {
  claim: ExistingTenantClaimDetailRow;
}) {
  const [state, formAction, isPending] = useActionState(
    updateExistingTenantClaimArrearsAction,
    initialExistingTenantClaimActionState,
  );

  const [arrearsStartDate, setArrearsStartDate] = useState(() =>
    getDefaultArrearsStartDate(claim),
  );

  const [paymentRows, setPaymentRows] = useState<PaymentHistoryDraft[]>(() => {
    if (claim.landlord_payment_history.length > 0) {
      return claim.landlord_payment_history.map((payment, index) =>
        createPaymentRow(payment, index),
      );
    }

    if (
      claim.landlord_last_payment_amount ||
      claim.landlord_last_payment_date
    ) {
      return [
        createPaymentRow({
          amount: Number(claim.landlord_last_payment_amount ?? 0),
          paidAt: claim.landlord_last_payment_date ?? "",
          note: "Last known payment",
        }),
      ];
    }

    return [createPaymentRow()];
  });

  const canSave =
    claim.status === "submitted" &&
    claim.tenant_move_in_date !== null &&
    claim.tenant_claimed_rent_amount !== null;

  const preview = useMemo(
    () =>
      calculateLiveArrearsPreview({
        moveInDate: claim.tenant_move_in_date,
        arrearsStartDate,
        rentAmount: Number(claim.tenant_claimed_rent_amount ?? 0),
        paymentFrequency: claim.tenant_payment_frequency,
        paymentRows,
      }),
    [
      arrearsStartDate,
      claim.tenant_claimed_rent_amount,
      claim.tenant_move_in_date,
      claim.tenant_payment_frequency,
      paymentRows,
    ],
  );

  return (
    <form action={formAction} className="space-y-4">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Arrears saved"
        errorTitle="Could not save arrears"
      />

      <input type="hidden" name="claimId" value={claim.id} />

      <div className="rounded-card border border-primary/15 bg-primary-soft/30 p-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-strong">
            Start from <span className="text-danger">*</span>
          </label>
          <input
            name="arrearsStartDate"
            type="date"
            value={arrearsStartDate}
            required
            disabled={!canSave || isPending}
            onChange={(event) => setArrearsStartDate(event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <PaymentHistoryRows
        rows={paymentRows}
        setRows={setPaymentRows}
        disabled={!canSave || isPending}
      />

      {state.fieldErrors?.paymentHistory?.[0] ? (
        <p className="text-sm font-semibold text-danger">
          {state.fieldErrors.paymentHistory[0]}
        </p>
      ) : null}

      {state.fieldErrors?.arrearsStartDate?.[0] ? (
        <p className="text-sm font-semibold text-danger">
          {state.fieldErrors.arrearsStartDate[0]}
        </p>
      ) : null}

      <ArrearsPreviewCards preview={preview} />

      <Button
        type="submit"
        variant="secondary"
        isLoading={isPending}
        disabled={!canSave}
        fullWidth
      >
        Save Arrears Record
      </Button>
    </form>
  );
}

function ApproveExistingTenantClaimForm({
  claim,
}: {
  claim: ExistingTenantClaimDetailRow;
}) {
  const [state, formAction, isPending] = useActionState(
    approveExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  const confirmedRentAmount =
    claim.landlord_confirmed_rent_amount ??
    claim.tenant_claimed_rent_amount ??
    claim.units?.annual_rent ??
    0;

  const confirmedMoveInDate =
    claim.landlord_confirmed_move_in_date ?? claim.tenant_move_in_date ?? "";

  const confirmedCurrentDueDate =
    claim.landlord_confirmed_current_due_date ??
    claim.bopa_calculated_current_due_date ??
    "";

  const openingBalance = claim.bopa_calculated_outstanding_balance ?? 0;

  const formResetKey = [
    claim.id,
    confirmedRentAmount,
    confirmedMoveInDate,
    confirmedCurrentDueDate,
    openingBalance,
    claim.landlord_review_notes ?? "",
  ].join(":");

  const canApprove =
    claim.status === "submitted" &&
    confirmedRentAmount > 0 &&
    confirmedMoveInDate.length > 0 &&
    confirmedCurrentDueDate.length > 0;

  return (
    <form key={formResetKey} action={formAction} className="space-y-4">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Tenant approved"
        errorTitle="Could not approve tenant"
      />

      <input type="hidden" name="claimId" value={claim.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyInput
          label="Confirmed rent amount"
          name="confirmedRentAmount"
          defaultValue={confirmedRentAmount}
          error={state.fieldErrors?.confirmedRentAmount?.[0]}
          required
        />

        <CurrencyInput
          label="Opening balance owed"
          name="openingBalance"
          defaultValue={openingBalance}
          helperText="This comes from the saved arrears record. Set to 0 only if the tenant is not owing."
          error={state.fieldErrors?.openingBalance?.[0]}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Confirmed move-in date"
          name="confirmedMoveInDate"
          type="date"
          defaultValue={confirmedMoveInDate}
          error={state.fieldErrors?.confirmedMoveInDate?.[0]}
          required
        />

        <Input
          label="Current due date"
          name="confirmedCurrentDueDate"
          type="date"
          defaultValue={confirmedCurrentDueDate}
          helperText="Override only if the landlord’s records differ."
          error={state.fieldErrors?.confirmedCurrentDueDate?.[0]}
          required
        />
      </div>

      <Textarea
        label="Review note"
        name="reviewNotes"
        placeholder="Optional note saved with the tenancy."
        defaultValue={claim.landlord_review_notes ?? ""}
        error={state.fieldErrors?.reviewNotes?.[0]}
      />

      <Button
        type="submit"
        isLoading={isPending}
        disabled={!canApprove}
        fullWidth
      >
        Approve and Create Tenancy
      </Button>
    </form>
  );
}

function DesktopClaimsTable({
  claims,
}: {
  claims: ExistingTenantClaimDetailRow[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-border-soft md:block">
      <table className="w-full border-collapse bg-white text-sm">
        <thead className="bg-background text-left text-xs font-black uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3">Tenant</th>
            <th className="px-4 py-3">Property / Unit</th>
            <th className="px-4 py-3">Rent</th>
            <th className="px-4 py-3">Move-in</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-soft">
          {claims.map((claim) => (
            <tr key={claim.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-extrabold text-text-strong">
                  {getTenantName(claim)}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {getTenantPhone(claim)}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-bold text-text-strong">
                  {getPropertyUnitLabel(claim)}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {claim.units?.properties?.address ?? "Address not available"}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-black text-text-strong">
                  {claim.tenant_claimed_rent_amount === null
                    ? "Not provided"
                    : formatNaira(Number(claim.tenant_claimed_rent_amount))}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {claim.tenant_payment_frequency}
                </p>
              </td>

              <td className="px-4 py-4 font-bold text-text-strong">
                {formatDate(claim.tenant_move_in_date)}
              </td>

              <td className="px-4 py-4 font-bold text-text-strong">
                {formatDate(getBopaDueDate(claim))}
              </td>

              <td className="px-4 py-4">
                <ExistingTenantClaimStatusBadge status={claim.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileClaimsList({
  claims,
}: {
  claims: ExistingTenantClaimDetailRow[];
}) {
  return (
    <div className="space-y-3 md:hidden">
      {claims.map((claim) => (
        <article
          key={claim.id}
          className="rounded-card border border-border-soft bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-text-strong">
                {getTenantName(claim)}
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                {getTenantPhone(claim)}
              </p>
            </div>

            <ExistingTenantClaimStatusBadge status={claim.status} />
          </div>

          <div className="mt-4 space-y-2 rounded-button bg-background p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Unit</span>
              <span className="text-right font-extrabold text-text-strong">
                {getPropertyUnitLabel(claim)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Rent</span>
              <span className="text-right font-black text-text-strong">
                {claim.tenant_claimed_rent_amount === null
                  ? "Not provided"
                  : formatNaira(Number(claim.tenant_claimed_rent_amount))}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Move-in</span>
              <span className="text-right font-bold text-text-strong">
                {formatDate(claim.tenant_move_in_date)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Due date</span>
              <span className="text-right font-bold text-text-strong">
                {formatDate(getBopaDueDate(claim))}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClaimReviewCard({ claim }: { claim: ExistingTenantClaimDetailRow }) {
  const canReject = claim.status === "pending" || claim.status === "submitted";

  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-text-strong">
              {getTenantName(claim)}
            </h2>
            <ExistingTenantClaimStatusBadge status={claim.status} />
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            {getPropertyUnitLabel(claim)}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3 text-sm">
              <BriefcaseBusiness
                aria-hidden="true"
                size={18}
                strokeWidth={2.5}
                className="text-primary"
              />
              <div>
                <p className="font-bold text-text-muted">Occupation</p>
                <p className="font-extrabold text-text-strong">
                  {claim.tenant_occupation ?? "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3 text-sm">
              <CreditCard
                aria-hidden="true"
                size={18}
                strokeWidth={2.5}
                className="text-primary"
              />
              <div>
                <p className="font-bold text-text-muted">Identification</p>
                <p className="font-extrabold text-text-strong">
                  {getIdTypeLabel(claim.tenant_id_type)}
                  {claim.tenant_id_number ? ` · ${claim.tenant_id_number}` : ""}
                </p>
              </div>
            </div>
          </div>

          {claim.tenant_notes ? (
            <p className="mt-3 rounded-button bg-background px-4 py-3 text-sm leading-6 text-text-muted">
              {claim.tenant_notes}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm lg:min-w-72">
          <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3">
            <CalendarClock
              aria-hidden="true"
              size={18}
              strokeWidth={2.5}
              className="text-primary"
            />
            <div>
              <p className="font-bold text-text-muted">Submitted</p>
              <p className="font-extrabold text-text-strong">
                {formatDateTime(claim.submitted_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3">
            <Home
              aria-hidden="true"
              size={18}
              strokeWidth={2.5}
              className="text-primary"
            />
            <div>
              <p className="font-bold text-text-muted">Due date</p>
              <p className="font-extrabold text-text-strong">
                {formatDate(getBopaDueDate(claim))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {claim.status === "submitted" ? (
        <div className="mt-5 space-y-4 rounded-card border border-border-soft bg-white p-4">
          <div>
            <h3 className="text-base font-black text-text-strong">Arrears</h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Enter the rent cycle to start from and record payments received.
              The outstanding balance updates automatically.
            </p>
          </div>

          <ArrearsEstimateForm claim={claim} />
        </div>
      ) : null}

      {claim.status === "submitted" ? (
        <div className="mt-5 space-y-4 rounded-card border border-primary/15 bg-primary-soft/30 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              size={22}
              strokeWidth={2.6}
              className="mt-0.5 shrink-0 text-primary"
            />

            <div>
              <h3 className="text-base font-black text-text-strong">
                Final approval
              </h3>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Confirm the rent, move-in date, current due date, and opening
                balance before creating the live tenancy.
              </p>
            </div>
          </div>

          <ApproveExistingTenantClaimForm claim={claim} />
        </div>
      ) : null}

      {canReject ? (
        <details className="mt-5 rounded-button bg-background p-4">
          <summary className="cursor-pointer text-sm font-extrabold text-danger">
            Reject this claim
          </summary>

          <div className="mt-4">
            <RejectExistingTenantClaimForm
              claimId={claim.id}
              disabled={!canReject}
            />
          </div>
        </details>
      ) : claim.rejected_reason ? (
        <div className="mt-5 flex gap-3 rounded-button bg-danger-soft p-4 text-sm leading-6 text-danger">
          <AlertTriangle
            aria-hidden="true"
            size={20}
            strokeWidth={2.6}
            className="shrink-0"
          />
          <p>{claim.rejected_reason}</p>
        </div>
      ) : null}
    </section>
  );
}

export function ExistingTenantClaimReviewList({
  claims,
}: ExistingTenantClaimReviewListProps) {
  const submittedClaims = claims.filter(
    (claim) => claim.status === "submitted",
  );
  const otherClaims = claims.filter((claim) => claim.status !== "submitted");

  return (
    <div className="space-y-6">
      {submittedClaims.length > 0 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-warning">
              Needs Review
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Review submitted details, save arrears, then approve the tenancy.
            </p>
          </div>

          <div className="space-y-4">
            {submittedClaims.map((claim) => (
              <article
                key={claim.id}
                className="flex flex-col gap-4 rounded-card border border-border-soft bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-black text-text-strong">
                    {getTenantName(claim)}
                  </p>
                  <p className="mt-1 text-base text-text-muted">
                    {getPropertyUnitLabel(claim)}
                  </p>
                </div>
                <Link href={`/existing-tenant-claims/${claim.id}`}>
                  <Button>Review claim</Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {claims.length > 0 ? (
        <div className="space-y-3">
          <DesktopClaimsTable claims={claims} />
          <MobileClaimsList claims={claims} />
        </div>
      ) : null}

      {otherClaims.length > 0 ? (
        <p className="text-sm font-semibold leading-6 text-text-muted">
          {otherClaims.length} claim
          {otherClaims.length === 1 ? "" : "s"} are pending, rejected, expired,
          approved, or cancelled.
        </p>
      ) : null}
    </div>
  );
}
