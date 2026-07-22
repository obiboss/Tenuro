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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateArrearsFromCycles,
  type ExistingTenantRentCycle,
} from "@/lib/existing-tenant-arrears";
import {
  calculateCurrentRentCycle,
  RENT_PAYMENT_FREQUENCY_LABELS,
} from "@/lib/rent-cycle";
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
  const confirmedRentAmountNumber = Number(
    claim.units?.rent_amount ?? claim.tenant_claimed_rent_amount ?? 0,
  );
  const paymentFrequency =
    claim.units?.rent_frequency ?? claim.tenant_payment_frequency;
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
        paymentFrequency,
        cycles,
      }),
    [claim.tenant_move_in_date, paymentFrequency, cycles],
  );

  const [confirmedMoveInDate, setConfirmedMoveInDate] = useState(
    claim.landlord_confirmed_move_in_date ?? claim.tenant_move_in_date ?? "",
  );
  const confirmedCurrentDueDate = useMemo(() => {
    if (!confirmedMoveInDate) {
      return "";
    }

    try {
      return calculateCurrentRentCycle({
        anchorDate: confirmedMoveInDate,
        paymentFrequency,
      }).periodStart;
    } catch {
      return "";
    }
  }, [confirmedMoveInDate, paymentFrequency]);

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
        </div>

        {claim.tenant_notes ? (
          <p className="mt-4 rounded-button bg-background p-4 text-base leading-7 text-text-muted">
            {claim.tenant_notes}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-card border border-border-soft bg-surface p-5">
        <div>
          <h2 className="text-lg font-black text-text-strong">Rent history</h2>
          <p className="mt-1 text-base leading-7 text-text-muted">
            Optional. Only record arrears for years where the tenant still owes
            rent. Review this before approving below.
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

      <div className="rounded-card border-2 border-danger/25 bg-danger-soft/30 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-danger">
          Amount owed from recorded years
        </p>
        <p className="mt-2 text-2xl font-black text-danger">
          {formatNaira(openingBalance)}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Only includes rent years where you recorded arrears. All other years
          are assumed fully paid.
        </p>
      </div>

      <section className="space-y-4 rounded-card border border-primary/15 bg-primary-soft/30 p-5">
        <div>
          <h2 className="text-lg font-black text-text-strong">
            Final approval
          </h2>
          <p className="mt-1 text-base leading-7 text-text-muted">
            Confirm the move-in date. The unit rent is locked, and BOPA calculates the current cycle automatically.
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

        <form
          id={`approve-claim-${claim.id}`}
          action={approveAction}
          className="space-y-4"
        >
          <input type="hidden" name="claimId" value={claim.id} />
          <input
            type="hidden"
            name="openingBalance"
            value={String(openingBalance)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-strong">Unit rent</p>
              <p className="flex min-h-14 items-center rounded-button border border-border-soft bg-surface px-4 text-base font-black text-text-strong">
                {formatNaira(confirmedRentAmountNumber)} · {RENT_PAYMENT_FREQUENCY_LABELS[paymentFrequency]}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-strong">
                Opening balance
              </p>
              <p className="flex min-h-14 items-center rounded-button border border-border-soft bg-surface px-4 text-base font-black text-danger">
                {formatNaira(openingBalance)}
              </p>
              <p className="text-sm text-text-muted">
                Matches the amount owed summary above.
              </p>
            </div>
          </div>

          <Input
            label="Confirmed move-in date"
            name="confirmedMoveInDate"
            type="date"
            value={confirmedMoveInDate}
            onChange={(event) => setConfirmedMoveInDate(event.target.value)}
            required
          />

          <div className="rounded-button border border-border-soft bg-background p-4">
            <p className="text-sm font-semibold text-text-muted">Current rent cycle started</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {formatDate(confirmedCurrentDueDate)}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Calculated from the original move-in date and the unit's locked frequency.
            </p>
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

      <ConfirmDialog
        open={showApproveConfirm}
        title="Confirm tenancy"
        description={`You are about to confirm ${tenantName}'s tenancy at ${getPropertyUnitLabel(claim)}. The current rent cycle started on ${formatDate(confirmedCurrentDueDate)} and BOPA will use it for future rent due dates. Check this date before continuing.`}
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
            <h2 className="text-lg font-black text-text-strong">
              Reject claim
            </h2>
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
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={rejectPending}
                >
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
