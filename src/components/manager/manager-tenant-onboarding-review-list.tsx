"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  approveManagerTenantOnboardingRequestAction,
  rejectManagerTenantOnboardingRequestAction,
  resendManagerFirstRentPaymentLinkAction,
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

const ACTIVE_REVIEW_STATUSES = new Set([
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
  "payment_expired",
]);

function formatNaira(amount: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function formatDate(date: string | null) {
  if (!date) {
    return "After approval";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

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
    payment_expired: "Payment link expired",
  };

  return labels[status];
}

function getStatusClassName(
  status: ManagerTenantOnboardingRequestRow["status"],
) {
  if (status === "submitted") {
    return "bg-warning-soft text-warning";
  }

  if (status === "payment_paid" || status === "approved") {
    return "bg-success-soft text-success";
  }

  if (
    status === "rejected" ||
    status === "expired" ||
    status === "cancelled" ||
    status === "payment_expired"
  ) {
    return "bg-danger-soft text-danger";
  }

  return "bg-primary-soft text-primary";
}

function getTenantTypeLabel(
  type: ManagerTenantOnboardingRequestRow["onboarding_type"],
) {
  return type === "current_occupant"
    ? "Current occupant"
    : "New incoming tenant";
}

function RequestReviewCard({
  request,
}: {
  request: ManagerTenantOnboardingRequestRow;
}) {
  const openedMessageRef = useRef<string | null>(null);
  const [showReject, setShowReject] = useState(false);

  const [approveState, approveAction, isApproving] = useActionState(
    approveManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const [resendState, resendAction, isResending] = useActionState(
    resendManagerFirstRentPaymentLinkAction,
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

  useEffect(() => {
    if (
      !resendState.ok ||
      !resendState.whatsappMessage ||
      !resendState.tenantWhatsappNumber ||
      openedMessageRef.current === resendState.whatsappMessage
    ) {
      return;
    }

    openedMessageRef.current = resendState.whatsappMessage;

    window.location.assign(
      buildWaMeUrl({
        phoneNumber: resendState.tenantWhatsappNumber,
        message: resendState.whatsappMessage,
      }),
    );
  }, [
    resendState.ok,
    resendState.tenantWhatsappNumber,
    resendState.whatsappMessage,
  ]);

  const canReview = request.status === "submitted";
  const canSendPayment =
    request.onboarding_type === "new_incoming_tenant" &&
    (request.status === "agreement_accepted" ||
      request.status === "payment_expired");

  const tenantName =
    request.tenant_full_name ?? request.invited_tenant_full_name ?? "Tenant";
  const tenantPhone =
    request.tenant_phone_number ?? request.invited_tenant_phone_number ?? "";
  const propertyName = request.manager_properties?.property_name ?? "Property";
  const unitLabel = request.manager_units?.unit_label ?? "Unit";

  return (
    <article className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-text-strong">{tenantName}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                  request.status,
                )}`}
              >
                {getStatusLabel(request.status)}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              {unitLabel} · {propertyName} ·{" "}
              {getTenantTypeLabel(request.onboarding_type)}
            </p>

            {tenantPhone ? (
              <p className="mt-1 text-sm font-semibold text-text-muted">
                {tenantPhone}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-96">
            <div className="rounded-card bg-surface p-3">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Rent
              </p>
              <p className="mt-1 text-sm font-black text-text-strong">
                {formatNaira(request.tenant_claimed_rent_amount)}
              </p>
            </div>

            <div className="rounded-card bg-surface p-3">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Move-in
              </p>
              <p className="mt-1 text-sm font-black text-text-strong">
                {formatDate(request.tenant_move_in_date)}
              </p>
            </div>

            <div className="rounded-card bg-primary-soft p-3">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Next rent due
              </p>
              <p className="mt-1 text-sm font-black text-text-strong">
                {formatDate(request.tenant_claimed_next_rent_due_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {approveState.message ? (
        <div
          role="alert"
          className={
            approveState.ok
              ? "mx-4 mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mx-4 mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {approveState.message}
        </div>
      ) : null}

      {resendState.message ? (
        <div
          role="alert"
          className={
            resendState.ok
              ? "mx-4 mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mx-4 mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {resendState.message}
        </div>
      ) : null}

      {rejectState.message ? (
        <div
          role="alert"
          className={
            rejectState.ok
              ? "mx-4 mt-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "mx-4 mt-4 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {rejectState.message}
        </div>
      ) : null}

      {canReview ? (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
          <form action={approveAction} className="space-y-4">
            <input type="hidden" name="requestId" value={request.id} />

            <div className="rounded-card bg-primary-soft p-4">
              <p className="text-sm font-black text-text-strong">
                Review tenant details
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Confirm the rent amount and move-in date before approving this
                tenant.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                label="Rent amount"
                name="confirmedRentAmount"
                defaultValue={String(request.tenant_claimed_rent_amount ?? "")}
                placeholder="0.00"
                error={approveState.fieldErrors?.confirmedRentAmount?.[0]}
                required
              />

              <Input
                label="Move-in date"
                name="confirmedMoveInDate"
                type="date"
                defaultValue={request.tenant_move_in_date ?? ""}
                error={approveState.fieldErrors?.confirmedMoveInDate?.[0]}
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

            <details className="rounded-card border border-border-soft bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-primary">
                Add review note
              </summary>

              <div className="mt-3 space-y-2">
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
            </details>

            <Button type="submit" isLoading={isApproving} fullWidth>
              {request.onboarding_type === "new_incoming_tenant"
                ? "Approve and Send Agreement"
                : "Approve Current Occupant"}
            </Button>
          </form>

          <aside className="space-y-4">
            <div className="rounded-card border border-border-soft bg-surface p-4">
              <p className="text-sm font-black text-text-strong">
                After approval
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {request.onboarding_type === "new_incoming_tenant"
                  ? "The tenant receives the agreement. After accepting it, the first rent payment button appears immediately."
                  : "The tenant record becomes active and the unit becomes occupied."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowReject((current) => !current)}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
            >
              {showReject ? "Hide rejection" : "Reject details"}
            </button>

            {showReject ? (
              <form action={rejectAction} className="space-y-3">
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
                    rows={4}
                    placeholder="Explain why this was rejected"
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
            ) : null}
          </aside>
        </div>
      ) : null}

      {canSendPayment ? (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-black text-text-strong">
              Tenant has accepted the agreement
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Send a fresh first rent payment link when the tenant is ready to
              pay.
            </p>
          </div>

          <form action={resendAction}>
            <input type="hidden" name="requestId" value={request.id} />

            <Button type="submit" isLoading={isResending} fullWidth>
              {request.status === "payment_expired"
                ? "Send New Payment Link"
                : "Send Payment Link"}
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
  const activeRequests = requests.filter((request) =>
    ACTIVE_REVIEW_STATUSES.has(request.status),
  );

  if (activeRequests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Tenant review
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          Review tenant submissions and approve the right tenant.
        </p>
      </div>

      <div className="grid gap-3">
        {activeRequests.map((request) => (
          <RequestReviewCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}
