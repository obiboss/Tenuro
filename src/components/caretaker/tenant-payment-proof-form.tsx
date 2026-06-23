"use client";

import { useActionState } from "react";
import { UploadCloud } from "lucide-react";
import { submitTenantPaymentProofAction } from "@/actions/caretaker.actions";
import { initialTenantPaymentProofActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";

type TenantPaymentProofFormProps = {
  token: string;
};

export function TenantPaymentProofForm({ token }: TenantPaymentProofFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitTenantPaymentProofAction,
    initialTenantPaymentProofActionState,
  );

  if (state.ok) {
    return (
      <div className="rounded-card border border-success/20 bg-success/10 p-4">
        <h2 className="text-lg font-black text-success">Proof submitted</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Your payment proof has been sent for landlord confirmation.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-4 rounded-card border border-border-soft bg-white p-4"
    >
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="text-sm font-black text-text-strong">
          Amount paid
        </label>
        <input
          name="amountPaid"
          type="number"
          min="1"
          step="1"
          required
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          placeholder="e.g. 500000"
        />
      </div>

      <div>
        <label className="text-sm font-black text-text-strong">
          Payment date
        </label>
        <input
          name="paymentDate"
          type="date"
          required
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-sm font-black text-text-strong">
          Payment method
        </label>
        <select
          name="paymentMethod"
          required
          defaultValue="bank_transfer"
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
        >
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-black text-text-strong">
          Reference / narration
        </label>
        <input
          name="paymentReference"
          type="text"
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="text-sm font-black text-text-strong">
          Upload payment proof
        </label>
        <input
          name="proofFile"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
        />
        <p className="mt-1 text-xs font-semibold text-text-muted">
          Upload JPG, PNG, WEBP, or PDF. Maximum 5MB.
        </p>
      </div>

      <div>
        <label className="text-sm font-black text-text-strong">Note</label>
        <textarea
          name="notes"
          rows={3}
          className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          placeholder="Optional"
        />
      </div>

      {state.message ? (
        <p className="rounded-2xl bg-danger/10 p-3 text-sm font-bold text-danger">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={isPending}>
        <UploadCloud aria-hidden="true" size={16} strokeWidth={2.6} />
        {isPending ? "Submitting..." : "Submit payment proof"}
      </Button>
    </form>
  );
}
