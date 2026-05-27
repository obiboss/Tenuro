"use client";

import { useActionState } from "react";
import {
  acceptPropertyApplicationAction,
  markTenantRejectedApartmentAction,
  rejectPropertyApplicationAction,
  waitlistPropertyApplicationAction,
} from "@/actions/property-applications.actions";
import {
  initialPropertyApplicationDecisionActionState,
  type PropertyApplicationDecisionActionState,
} from "@/actions/property-applications.state";

function DecisionMessage({
  state,
}: {
  state: PropertyApplicationDecisionActionState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`rounded-button px-4 py-3 text-sm font-semibold leading-6 ${
        state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {state.message}
    </div>
  );
}

function AcceptApplicationForm({ applicationId }: { applicationId: string }) {
  const [state, action, isPending] = useActionState(
    acceptPropertyApplicationAction,
    initialPropertyApplicationDecisionActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input
        type="hidden"
        name="applicationId"
        value={applicationId}
        readOnly
      />
      <DecisionMessage state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-button bg-success px-4 py-3 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Accepting..." : "Accept application"}
      </button>
    </form>
  );
}

function ReasonDecisionForm({
  applicationId,
  actionType,
}: {
  applicationId: string;
  actionType: "reject" | "waitlist";
}) {
  const [state, action, isPending] = useActionState(
    actionType === "reject"
      ? rejectPropertyApplicationAction
      : waitlistPropertyApplicationAction,
    initialPropertyApplicationDecisionActionState,
  );

  const isReject = actionType === "reject";

  return (
    <form action={action} className="space-y-3">
      <input
        type="hidden"
        name="applicationId"
        value={applicationId}
        readOnly
      />

      <label
        htmlFor={`${actionType}-reason-${applicationId}`}
        className="text-xs font-black uppercase tracking-wide text-text-muted"
      >
        {isReject ? "Rejection reason" : "Waitlist note"}
      </label>

      <textarea
        id={`${actionType}-reason-${applicationId}`}
        name="reason"
        rows={2}
        maxLength={500}
        className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
        placeholder={
          isReject
            ? "Optional reason for rejecting this application"
            : "Optional note for waitlisting this application"
        }
      />

      <DecisionMessage state={state} />

      <button
        type="submit"
        disabled={isPending}
        className={`w-full rounded-button px-4 py-3 text-sm font-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${
          isReject ? "bg-danger text-white" : "bg-warning-soft text-warning"
        }`}
      >
        {isPending
          ? isReject
            ? "Rejecting..."
            : "Waitlisting..."
          : isReject
            ? "Reject application"
            : "Waitlist application"}
      </button>
    </form>
  );
}

function TenantRejectedApartmentForm({
  applicationId,
}: {
  applicationId: string;
}) {
  const [state, action, isPending] = useActionState(
    markTenantRejectedApartmentAction,
    initialPropertyApplicationDecisionActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input
        type="hidden"
        name="applicationId"
        value={applicationId}
        readOnly
      />

      <label
        htmlFor={`tenant-rejected-reason-${applicationId}`}
        className="text-xs font-black uppercase tracking-wide text-text-muted"
      >
        Tenant rejection reason
      </label>

      <textarea
        id={`tenant-rejected-reason-${applicationId}`}
        name="reason"
        rows={2}
        minLength={3}
        maxLength={500}
        required
        className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
        placeholder="Example: Tenant rejected after inspection, rejected agreement terms, or no longer interested."
      />

      <DecisionMessage state={state} />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-button bg-danger-soft px-4 py-3 text-sm font-black text-danger transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Recording tenant rejection..."
          : "Tenant rejected this apartment"}
      </button>
    </form>
  );
}

export function PropertyApplicationDecisionForms({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  if (status === "submitted_for_landlord_review" || status === "waitlisted") {
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        <AcceptApplicationForm applicationId={applicationId} />
        <ReasonDecisionForm
          applicationId={applicationId}
          actionType="waitlist"
        />
        <ReasonDecisionForm applicationId={applicationId} actionType="reject" />
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="space-y-3">
        <div className="rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success">
          This application has been accepted and converted into the tenant
          pipeline. If the tenant rejects the apartment after inspection or
          agreement review, record it here.
        </div>

        <TenantRejectedApartmentForm applicationId={applicationId} />
      </div>
    );
  }

  return (
    <div className="rounded-button bg-background px-4 py-3 text-sm font-semibold leading-6 text-text-muted">
      Decision already recorded for this application.
    </div>
  );
}
