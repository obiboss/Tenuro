"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  approveExistingTenantClaimAction,
  rejectExistingTenantClaimAction,
  updateExistingTenantClaimArrearsAction,
} from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import {
  buildInitialRentCyclesForClaim,
  ExistingTenantRentHistoryTable,
} from "@/components/tenant/existing-tenant-rent-history-table";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateArrearsFromCycles,
  calculateCurrentDueDate,
  type ExistingTenantRentCycle,
} from "@/lib/existing-tenant-arrears";
import type {
  ExistingTenantClaimDetailRow,
  ExistingTenantClaimIdType,
} from "@/server/repositories/existing-tenant-claims.repository";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantClaimReviewDetailProps = {
  claim: ExistingTenantClaimDetailRow;
};

const idTypeLabels: Record<ExistingTenantClaimIdType, string> = {
  nin: "NIN",
  passport: "International Passport",
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getTenantInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getPropertyUnitLabel(claim: ExistingTenantClaimDetailRow) {
  const propertyName = claim.units?.properties?.property_name ?? "Property";
  const buildingName = claim.units?.building_name;
  const unitIdentifier = claim.units?.unit_identifier ?? "Unit";

  return `${propertyName} · ${
    buildingName ? `${buildingName} · ` : ""
  }${unitIdentifier}`;
}

export function ExistingTenantClaimReviewDetail({
  claim,
}: ExistingTenantClaimReviewDetailProps) {
  const router = useRouter();
  const tenantName =
    claim.tenant_full_name ?? claim.invited_tenant_full_name ?? "Tenant";

  const initialRentState = useMemo(
    () => buildInitialRentCyclesForClaim(claim),
    [claim],
  );

  const [cycles, setCycles] = useState<ExistingTenantRentCycle[]>(
    initialRentState.cycles,
  );
  const [confirmedRentAmount, setConfirmedRentAmount] = useState(
    String(
      claim.landlord_confirmed_rent_amount ??
        claim.tenant_claimed_rent_amount ??
        claim.units?.annual_rent ??
        0,
    ),
  );
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [arrearsState, arrearsAction, arrearsPending] = useActionState(
    updateExistingTenantClaimArrearsAction,
    initialExistingTenantClaimActionState,
  );

  const [approveState, approveAction, approvePending] = useActionState(
    approveExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  const liveSummary = useMemo(
    () =>
      calculateArrearsFromCycles({
        moveInDate: claim.tenant_move_in_date ?? "",
        paymentFrequency: claim.tenant_payment_frequency,
        cycles,
      }),
    [claim.tenant_move_in_date, claim.tenant_payment_frequency, cycles],
  );

  const confirmedRentAmountNumber = Number(confirmedRentAmount || 0);

  const [confirmedMoveInDate, setConfirmedMoveInDate] = useState(
    claim.landlord_confirmed_move_in_date ?? claim.tenant_move_in_date ?? "",
  );

  const confirmedCurrentDueDate = useMemo(
    () =>
      calculateCurrentDueDate({
        moveInDate: confirmedMoveInDate,
        paymentFrequency: claim.tenant_payment_frequency,
      }),
    [claim.tenant_payment_frequency, confirmedMoveInDate],
  );

  const openingBalance = liveSummary.amountOwed;

  useEffect(() => {
    if (approveState.ok && approveState.tenantId) {
      router.push(`/tenants/${approveState.tenantId}`);
      router.refresh();
    }
  }, [approveState.ok, approveState.tenantId, router]);

  useEffect(() => {
    if (rejectState.ok) {
      router.push("/existing-tenant-claims");
      router.refresh();
    }
  }, [rejectState.ok, router]);

  if (claim.status !== "submitted") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/existing-tenant-claims"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          <ArrowLeft size={16} />
          Back to claims
        </Link>
        <p className="rounded-card bg-background p-4 text-sm text-text-muted">
          This claim is no longer awaiting review.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/existing-tenant-claims"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary"
      >
        <ArrowLeft size={16} />
        Back to claims
      </Link>

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-black text-primary">
            {getTenantInitials(tenantName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-text-strong">
                {tenantName}
              </h1>
              <Badge tone="warning">Needs Review</Badge>
            </div>
            <p className="mt-1 text-base font-semibold text-text-muted">
              {getPropertyUnitLabel(claim)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Phone</p>
            <p className="mt-1 text-base font-extrabold text-text-strong">
              {claim.tenant_phone_number ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Occupation</p>
            <p className="mt-1 text-base font-extrabold text-text-strong">
              {claim.tenant_occupation ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Identification</p>
            <p className="mt-1 text-base font-extrabold text-text-strong">
              {claim.tenant_id_type
                ? idTypeLabels[claim.tenant_id_type]
                : "Not provided"}
              {claim.tenant_id_number ? ` · ${claim.tenant_id_number}` : ""}
            </p>
          </div>
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Move-in date</p>
            <p className="mt-1 text-base font-extrabold text-text-strong">
              {formatDate(claim.tenant_move_in_date)}
            </p>
          </div>
          <div className="rounded-button border border-warning/30 bg-warning-soft/40 p-4 sm:col-span-2">
            <p className="text-sm font-bold text-warning">Rent due date (tenant stated)</p>
            <p className="mt-1 text-base font-black text-warning">
              {formatDate(claim.tenant_claimed_next_rent_due_date)}
            </p>
          </div>
        </div>

        {claim.tenant_notes ? (
          <p className="mt-4 rounded-button bg-background p-4 text-base leading-7 text-text-muted">
            {claim.tenant_notes}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-card border border-primary/15 bg-primary-soft/30 p-5">
        <div>
          <h2 className="text-lg font-black text-text-strong">Final approval</h2>
          <p className="mt-1 text-base leading-7 text-text-muted">
            Confirm the rent, move-in date, and amount owed before creating the
            live tenancy.
          </p>
        </div>

        {approveState.ok === false && approveState.message ? (
          <div
            role="alert"
            className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            {approveState.message}
          </div>
        ) : null}

        <form id={`approve-claim-${claim.id}`} action={approveAction} className="space-y-4">
          <input type="hidden" name="claimId" value={claim.id} />
          <input
            type="hidden"
            name="confirmedCurrentDueDate"
            value={confirmedCurrentDueDate}
          />
          <input type="hidden" name="openingBalance" value={String(openingBalance)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              label="Confirmed rent amount"
              name="confirmedRentAmount"
              value={confirmedRentAmount}
              onValueChange={setConfirmedRentAmount}
              required
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-strong">Amount owed</p>
              <p className="flex min-h-14 items-center rounded-button border border-border-soft bg-surface px-4 text-base font-black text-danger">
                {formatNaira(openingBalance)}
              </p>
              <p className="text-sm text-text-muted">
                Only includes years where you recorded arrears. Leave rent history
                unchanged if the tenant owes nothing.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Confirmed move-in date"
              name="confirmedMoveInDate"
              type="date"
              value={confirmedMoveInDate}
              onChange={(event) => setConfirmedMoveInDate(event.target.value)}
              required
            />
            <Input
              label="Current due date"
              type="date"
              value={confirmedCurrentDueDate}
              readOnly
              helperText="Calculated from the confirmed move-in date."
            />
          </div>

          <Textarea
            label="Review note"
            name="reviewNotes"
            placeholder="Optional note saved with the tenancy."
            defaultValue={claim.landlord_review_notes ?? ""}
          />

          <Button
            type="button"
            fullWidth
            onClick={() => setShowApproveConfirm(true)}
            disabled={approvePending}
          >
            Approve and create tenancy
          </Button>
        </form>

        <button
          type="button"
          className="min-h-11 text-sm font-extrabold text-danger"
          onClick={() => setShowRejectConfirm(true)}
        >
          Reject this claim
        </button>
      </section>

      <section className="space-y-4 rounded-card border border-border-soft bg-surface p-5">
        <div>
          <h2 className="text-lg font-black text-text-strong">Rent history</h2>
          <p className="mt-1 text-base leading-7 text-text-muted">
            Optional. Only record arrears for years where the tenant still owes
            rent.
          </p>
        </div>

        <form action={arrearsAction} className="space-y-4">
          <ActionResultToast
            ok={arrearsState.ok}
            message={arrearsState.message}
            successTitle="Rent history saved"
            errorTitle="Could not save rent history"
          />

          <input type="hidden" name="claimId" value={claim.id} />
          <input
            type="hidden"
            name="rentCyclesJson"
            value={JSON.stringify(
              cycles.map((cycle) => ({
                periodStart: cycle.periodStart,
                periodEnd: cycle.periodEnd,
                rentCharged: cycle.rentCharged,
                assumedPaid: cycle.assumedPaid,
                payments: cycle.payments,
              })),
            )}
          />

          <ExistingTenantRentHistoryTable
            claim={claim}
            cycles={cycles}
            confirmedRentAmount={confirmedRentAmountNumber}
            onCyclesChange={setCycles}
            disabled={arrearsPending}
          />

          <Button
            type="submit"
            variant="secondary"
            isLoading={arrearsPending}
            fullWidth
          >
            Save rent history
          </Button>
        </form>
      </section>

      <ConfirmDialog
        open={showApproveConfirm}
        title="Confirm tenancy"
        description={`You are about to confirm ${tenantName}'s tenancy at ${getPropertyUnitLabel(claim)}. The move-in date of ${formatDate(confirmedMoveInDate)} will be used to calculate all future rent due dates. This date can only be changed later from the tenancy settings page. Make sure this date is correct before continuing.`}
        confirmLabel="Confirm and approve"
        cancelLabel="Go back and check"
        isLoading={approvePending}
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={() => {
          setShowApproveConfirm(false);
          const form = document.getElementById(
            `approve-claim-${claim.id}`,
          ) as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      />

      {showRejectConfirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-card border border-border-soft bg-white p-6 shadow-card">
            <h2 className="text-lg font-black text-text-strong">Reject claim</h2>
            <p className="mt-2 text-base text-text-muted">
              Add an optional reason for rejecting this claim.
            </p>
            <form action={rejectAction} className="mt-4 space-y-4">
              <input type="hidden" name="claimId" value={claim.id} />
              <Textarea
                label="Rejection reason"
                name="reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Optional reason for the tenant."
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRejectConfirm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isLoading={rejectPending}>
                  Reject claim
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ActionResultToast
        ok={approveState.ok}
        message={
          approveState.ok
            ? `${approveState.tenantName ?? tenantName}'s tenancy has been created.`
            : approveState.message
        }
        successTitle="Tenancy created"
        errorTitle="Could not approve claim"
      />
    </div>
  );
}
