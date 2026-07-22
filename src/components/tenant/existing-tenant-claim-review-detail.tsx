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
  calculateCurrentRentDueDate,
  calculateNextRentDueDate,
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
  const openingBalance = liveSummary.amountOwed;
  const confirmedRentDueDate = useMemo(() => {
    if (!confirmedMoveInDate) {
      return "";
    }

    try {
      const calculator =
        openingBalance > 0
          ? calculateCurrentRentDueDate
          : calculateNextRentDueDate;

      return calculator({
        anchorDate: confirmedMoveInDate,
        paymentFrequency,
      });
    } catch {
      return "";
    }
  }, [confirmedMoveInDate, openingBalance, paymentFrequency]);

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
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link
        href="/existing-tenant-claims"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary"
      >
        <ArrowLeft size={16} />
        Back to tenants
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-text-strong">
            {tenantName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {getPropertyUnitLabel(claim)}
          </p>
        </div>
        <Badge tone="primary">Ready to save</Badge>
      </header>

      <div className="rounded-button border border-primary/20 bg-primary-soft px-4 py-3">
        <p className="font-black text-text-strong">Confirm the existing tenancy</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          {tenantName} already lives in this unit. Confirm the original move-in date and rent position, then save the tenant. A new agreement is not required.
        </p>
      </div>

      <form
        id={`approve-claim-${claim.id}`}
        action={approveAction}
        className="space-y-4 rounded-card border border-border-soft bg-white p-4 shadow-card sm:p-5"
      >
        <input type="hidden" name="claimId" value={claim.id} />
        <input type="hidden" name="openingBalance" value={String(openingBalance)} />

        {approveState.ok === false && approveState.message ? (
          <div
            role="alert"
            className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            {approveState.message}
          </div>
        ) : null}

        <div>
          <h2 className="text-base font-black text-text-strong">Tenancy details</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Unit rent</p>
              <p className="mt-1 font-black text-text-strong">
                {formatNaira(confirmedRentAmountNumber)}
              </p>
            </div>
            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Collection</p>
              <p className="mt-1 font-black text-text-strong">
                {RENT_PAYMENT_FREQUENCY_LABELS[paymentFrequency]}
              </p>
            </div>
            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Last payment</p>
              <p className="mt-1 font-black text-text-strong">
                {claim.landlord_last_payment_amount
                  ? formatNaira(Number(claim.landlord_last_payment_amount))
                  : "Not recorded"}
              </p>
            </div>
            <div className="rounded-button bg-background p-3">
              <p className="text-xs font-bold text-text-muted">Payment date</p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(claim.landlord_last_payment_date)}
              </p>
            </div>
          </div>
        </div>

        <Input
          label="Original move-in date"
          name="confirmedMoveInDate"
          type="date"
          value={confirmedMoveInDate}
          onChange={(event) => setConfirmedMoveInDate(event.target.value)}
          helperText="This sets every future rent due date and cannot be changed later."
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-semibold text-text-muted">Rent due date</p>
            <p className="mt-1 text-lg font-black text-text-strong">
              {formatDate(confirmedRentDueDate)}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
              {openingBalance > 0
                ? "Outstanding rent remains on this cycle."
                : "The tenant is paid up; this is the next renewal date."}
            </p>
          </div>
          <div
            className={`rounded-button p-4 ${
              openingBalance > 0 ? "bg-danger-soft" : "bg-success-soft"
            }`}
          >
            <p className="text-sm font-semibold text-text-muted">Amount owed</p>
            <p
              className={`mt-1 text-lg font-black ${
                openingBalance > 0 ? "text-danger" : "text-success"
              }`}
            >
              {formatNaira(openingBalance)}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
              {openingBalance > 0 ? "Review unpaid periods below." : "No arrears recorded."}
            </p>
          </div>
        </div>

        <details className="rounded-button border border-border-soft bg-background">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-primary">
            Add a private note
          </summary>
          <div className="border-t border-border-soft p-4">
            <Textarea
              label="Private note"
              name="reviewNotes"
              placeholder="Optional note saved with the tenancy."
              defaultValue={claim.landlord_review_notes ?? ""}
            />
          </div>
        </details>

        <div className="sticky bottom-20 z-20 -mx-4 border-t border-border-soft bg-white p-4 sm:static sm:mx-0 sm:border-0 sm:p-0">
          <Button
            type="button"
            fullWidth
            onClick={() => setShowApproveConfirm(true)}
            disabled={approvePending}
          >
            Save existing tenant
          </Button>
        </div>
      </form>

      <details className="rounded-card border border-border-soft bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black text-primary sm:px-5">
          Review tenant details and unpaid rent
        </summary>

        <div className="space-y-5 border-t border-border-soft p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Phone</p>
              <p className="mt-1 font-extrabold text-text-strong">
                {claim.tenant_phone_number ?? "Not provided"}
              </p>
            </div>
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Occupation</p>
              <p className="mt-1 font-extrabold text-text-strong">
                {claim.tenant_occupation ?? "Not provided"}
              </p>
            </div>
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Identification</p>
              <p className="mt-1 font-extrabold text-text-strong">
                {claim.tenant_id_type
                  ? idTypeLabels[claim.tenant_id_type]
                  : "Not provided"}
                {claim.tenant_id_number ? ` · ${claim.tenant_id_number}` : ""}
              </p>
            </div>
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Tenant's move-in date</p>
              <p className="mt-1 font-extrabold text-text-strong">
                {formatDate(claim.tenant_move_in_date)}
              </p>
            </div>
          </div>

          {claim.tenant_notes ? (
            <div className="rounded-button bg-background p-4 text-sm font-semibold leading-6 text-text-muted">
              {claim.tenant_notes}
            </div>
          ) : null}

          <div className="border-t border-border-soft pt-5">
            <h2 className="text-base font-black text-text-strong">Previous unpaid rent</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Only add periods where the tenant still owes rent. All other periods are treated as paid.
            </p>

            <form action={arrearsAction} className="mt-4 space-y-4">
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
                Save unpaid rent
              </Button>
            </form>
          </div>

          <button
            type="button"
            className="min-h-11 text-sm font-extrabold text-danger"
            onClick={() => setShowRejectConfirm(true)}
          >
            Reject this tenant record
          </button>
        </div>
      </details>

      <ConfirmDialog
        open={showApproveConfirm}
        title="Save existing tenant"
        description={`You are about to save ${tenantName} as the current tenant of ${getPropertyUnitLabel(claim)}. The rent due date is ${formatDate(confirmedRentDueDate)}. No new agreement will be created.`}
        confirmLabel="Save tenant"
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
            ? `${approveState.tenantName ?? tenantName} is now saved as the current tenant.`
            : approveState.message
        }
        successTitle="Existing tenant saved"
        errorTitle="Could not approve claim"
      />
    </div>
  );
}
