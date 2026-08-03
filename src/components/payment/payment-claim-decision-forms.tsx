"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  confirmCaretakerPaymentClaimAction,
  rejectCaretakerPaymentClaimAction,
} from "@/actions/caretaker.actions";
import { initialCaretakerPaymentClaimDecisionActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";

export function PaymentClaimDecisionForms({ claimId }: { claimId: string }) {
  const [confirmState, confirmAction, isConfirming] = useActionState(
    confirmCaretakerPaymentClaimAction,
    initialCaretakerPaymentClaimDecisionActionState,
  );
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectCaretakerPaymentClaimAction,
    initialCaretakerPaymentClaimDecisionActionState,
  );

  return (
    <div className="space-y-3">
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
          {isRejecting ? "Rejecting..." : "Reject payment"}
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
            rejectState.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {rejectState.message}
        </p>
      ) : null}
    </div>
  );
}
