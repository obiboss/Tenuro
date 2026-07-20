"use client";

import { useActionState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import {
  confirmCaretakerPaymentClaimAction,
  rejectCaretakerPaymentClaimAction,
} from "@/actions/caretaker.actions";
import { initialCaretakerPaymentClaimDecisionActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/server/utils/money";
import type { CaretakerPaymentClaimView } from "@/server/services/caretaker-payment-claims.service";

type PendingPaymentClaimsPanelProps = {
  claims: CaretakerPaymentClaimView[];
};

function ClaimDecisionForms({ claimId }: { claimId: string }) {
  const [confirmState, confirmAction, isConfirming] = useActionState(
    confirmCaretakerPaymentClaimAction,
    initialCaretakerPaymentClaimDecisionActionState,
  );

  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectCaretakerPaymentClaimAction,
    initialCaretakerPaymentClaimDecisionActionState,
  );

  return (
    <div className="mt-4 space-y-3">
      <form action={confirmAction}>
        <input type="hidden" name="claimId" value={claimId} />
        <Button type="submit" fullWidth disabled={isConfirming}>
          <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2.6} />
          {isConfirming ? "Confirming..." : "Confirm payment"}
        </Button>
      </form>

      <form action={rejectAction} className="space-y-2">
        <input type="hidden" name="claimId" value={claimId} />
        <input
          name="rejectionReason"
          type="text"
          required
          minLength={3}
          className="w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          placeholder="Reason if rejecting"
        />
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          disabled={isRejecting}
        >
          <XCircle aria-hidden="true" size={16} strokeWidth={2.6} />
          {isRejecting ? "Rejecting..." : "Reject claim"}
        </Button>
      </form>

      {confirmState.message ? (
        <p
          className={`rounded-2xl p-3 text-sm font-bold ${
            confirmState.ok
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {confirmState.message}
        </p>
      ) : null}

      {rejectState.message ? (
        <p
          className={`rounded-2xl p-3 text-sm font-bold ${
            rejectState.ok
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {rejectState.message}
        </p>
      ) : null}
    </div>
  );
}

export function PendingPaymentClaimsPanel({
  claims,
}: PendingPaymentClaimsPanelProps) {
  if (claims.length === 0) {
    return (
      <div className="rounded-card border border-border-soft bg-white p-5">
        <h2 className="text-lg font-black text-text-strong">
          No payments are waiting for confirmation
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Payments reported by tenants or caretakers will appear here for you to
          check.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <article
          key={claim.id}
          className="rounded-card border border-border-soft bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-text-strong">
                {claim.tenantName}
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                {claim.propertyUnitLabel}
              </p>
            </div>

            <Badge tone="warning">Waiting for your confirmation</Badge>
          </div>

          <div className="mt-4 grid gap-2 text-sm font-bold text-text-muted sm:grid-cols-2">
            <p>Amount reported: {formatNaira(claim.amountPaid)}</p>
            <p>Payment date: {claim.paymentDate}</p>
            <p>Method: {claim.paymentMethod.replace("_", " ")}</p>
            {claim.paymentReference ? (
              <p>Ref: {claim.paymentReference}</p>
            ) : null}
            {claim.caretakerName ? (
              <p>Caretaker: {claim.caretakerName}</p>
            ) : null}
          </div>

          {claim.notes ? (
            <p className="mt-3 rounded-2xl bg-background p-3 text-sm font-semibold leading-6 text-text-muted">
              {claim.notes}
            </p>
          ) : null}

          {claim.proofUrl ? (
            <a
              href={claim.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block"
            >
              <Button type="button" variant="secondary" fullWidth>
                <ExternalLink aria-hidden="true" size={16} strokeWidth={2.6} />
                View bank receipt
              </Button>
            </a>
          ) : null}

          <ClaimDecisionForms claimId={claim.id} />
        </article>
      ))}
    </div>
  );
}
