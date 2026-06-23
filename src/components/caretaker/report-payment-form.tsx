"use client";

import { useActionState } from "react";
import { BellRing } from "lucide-react";
import { reportCaretakerPaymentAction } from "@/actions/caretaker.actions";
import { initialCaretakerReportPaymentActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/server/utils/money";

type ReportPaymentFormProps = {
  tenancyId: string;
  tenantName: string;
  propertyUnitLabel: string;
  rentAmount: number;
};

export function ReportPaymentForm({
  tenancyId,
  tenantName,
  propertyUnitLabel,
  rentAmount,
}: ReportPaymentFormProps) {
  const [state, formAction, isPending] = useActionState(
    reportCaretakerPaymentAction,
    initialCaretakerReportPaymentActionState,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border-soft bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Tenant
        </p>
        <h2 className="mt-1 text-xl font-black text-text-strong">
          {tenantName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          {propertyUnitLabel}
        </p>
        <p className="mt-3 text-sm font-bold text-text-muted">
          Rent: {formatNaira(rentAmount)}
        </p>
      </div>

      <form
        action={formAction}
        encType="multipart/form-data"
        className="space-y-4 rounded-card border border-border-soft bg-white p-4"
      >
        <input type="hidden" name="tenancyId" value={tenancyId} />

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
            className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
            defaultValue="bank_transfer"
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
            Proof upload
          </label>
          <input
            name="proofFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs font-semibold text-text-muted">
            Optional for caretaker report. Upload JPG, PNG, WEBP, or PDF.
          </p>
        </div>

        <div>
          <label className="text-sm font-black text-text-strong">Note</label>
          <textarea
            name="notes"
            rows={3}
            className="mt-2 w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary"
            placeholder="Optional note for the landlord"
          />
        </div>

        {state.message ? (
          <p
            className={`rounded-2xl p-3 text-sm font-bold ${
              state.ok
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending}>
          <BellRing aria-hidden="true" size={16} strokeWidth={2.6} />
          {isPending ? "Submitting..." : "Submit for landlord confirmation"}
        </Button>
      </form>
    </div>
  );
}
