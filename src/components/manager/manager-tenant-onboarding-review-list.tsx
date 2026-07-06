"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  approveManagerTenantOnboardingRequestAction,
  rejectManagerTenantOnboardingRequestAction,
} from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type ManagerTenantOnboardingReviewListProps = {
  requests: ManagerTenantOnboardingRequestRow[];
};

function getStatusLabel(status: ManagerTenantOnboardingRequestRow["status"]) {
  const labels: Record<ManagerTenantOnboardingRequestRow["status"], string> = {
    pending: "Link sent",
    submitted: "Needs review",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    expired: "Expired",
    agreement_sent: "Agreement sent",
    agreement_accepted: "Agreement accepted",
    payment_initialized: "Payment link sent",
    payment_paid: "Paid",
    payment_expired: "Payment expired",
  };

  return labels[status];
}

function RequestReviewCard({
  request,
}: {
  request: ManagerTenantOnboardingRequestRow;
}) {
  const openedMessageRef = useRef<string | null>(null);

  const [approveState, approveAction, isApproving] = useActionState(
    approveManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  useEffect(() => {
    if (
      !approveState.ok ||
      !approveState.whatsappMessage ||
      !approveState.tenantWhatsappNumber ||
      openedMessageRef.current === approveState.whatsappMessage
    ) {
      return;
    }

    openedMessageRef.current = approveState.whatsappMessage;

    window.location.assign(
      buildWaMeUrl({
        phoneNumber: approveState.tenantWhatsappNumber,
        message: approveState.whatsappMessage,
      }),
    );
  }, [
    approveState.ok,
    approveState.tenantWhatsappNumber,
    approveState.whatsappMessage,
  ]);

  const canReview = request.status === "submitted";

  return (
    <article className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-text-strong">
            {request.tenant_full_name ??
              request.invited_tenant_full_name ??
              "Tenant"}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            {request.manager_units?.unit_label ?? "Unit"} ·{" "}
            {request.onboarding_type === "current_occupant"
              ? "Current occupant"
              : "New incoming tenant"}
          </p>
        </div>

        <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
          {getStatusLabel(request.status)}
        </span>
      </div>

      {approveState.message ? (
        <div
          role="alert"
          className={
            approveState.ok
              ? "mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {approveState.message}
        </div>
      ) : null}

      {rejectState.message ? (
        <div
          role="alert"
          className={
            rejectState.ok
              ? "mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {rejectState.message}
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <form
            action={approveAction}
            className="space-y-4 rounded-card bg-surface p-4"
          >
            <input type="hidden" name="requestId" value={request.id} />

            <CurrencyInput
              label="Confirmed rent amount"
              name="confirmedRentAmount"
              defaultValue={String(request.tenant_claimed_rent_amount ?? "")}
              placeholder="0.00"
              error={approveState.fieldErrors?.confirmedRentAmount?.[0]}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Move-in date"
                name="confirmedMoveInDate"
                type="date"
                defaultValue={request.tenant_move_in_date ?? ""}
                error={approveState.fieldErrors?.confirmedMoveInDate?.[0]}
                required
              />

              <Input
                label="Next rent due date"
                name="confirmedNextRentDueDate"
                type="date"
                defaultValue={request.tenant_claimed_next_rent_due_date ?? ""}
                error={approveState.fieldErrors?.confirmedNextRentDueDate?.[0]}
                required
              />
            </div>

            <CurrencyInput
              label="Opening balance"
              name="openingBalance"
              defaultValue="0"
              placeholder="0.00"
              error={approveState.fieldErrors?.openingBalance?.[0]}
              required
            />

            <div className="space-y-2">
              <label
                htmlFor={`review-${request.id}`}
                className="text-sm font-bold text-text-strong"
              >
                Review note
              </label>
              <textarea
                id={`review-${request.id}`}
                name="reviewNotes"
                rows={3}
                placeholder="Optional"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
              />
            </div>

            <Button type="submit" isLoading={isApproving} fullWidth>
              Approve
            </Button>
          </form>

          <form
            action={rejectAction}
            className="space-y-4 rounded-card bg-surface p-4"
          >
            <input type="hidden" name="requestId" value={request.id} />

            <div className="space-y-2">
              <label
                htmlFor={`reject-${request.id}`}
                className="text-sm font-bold text-text-strong"
              >
                Rejection reason
              </label>
              <textarea
                id={`reject-${request.id}`}
                name="reason"
                rows={5}
                placeholder="Why are you rejecting this?"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
              />
              {rejectState.fieldErrors?.reason?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {rejectState.fieldErrors.reason[0]}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              variant="secondary"
              isLoading={isRejecting}
              fullWidth
            >
              Reject
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export function ManagerTenantOnboardingReviewList({
  requests,
}: ManagerTenantOnboardingReviewListProps) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Tenant onboarding
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          Review submitted tenant details and continue the right workflow.
        </p>
      </div>

      <div className="grid gap-3">
        {requests.map((request) => (
          <RequestReviewCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}
