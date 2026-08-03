import { ExternalLink } from "lucide-react";
import { PaymentClaimDecisionForms } from "@/components/payment/payment-claim-decision-forms";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/server/utils/money";
import type { CaretakerPaymentClaimView } from "@/server/services/caretaker-payment-claims.service";

type PaymentClaimDetailProps = {
  claim: CaretakerPaymentClaimView;
  rentDue: number;
  amountOwing: number;
  dueDate: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PaymentClaimDetail({
  claim,
  rentDue,
  amountOwing,
  dueDate,
}: PaymentClaimDetailProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Unit / flat</p>
          <p className="mt-1 font-black text-text-strong">
            {claim.propertyUnitLabel}
          </p>
        </div>
        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Rent due</p>
          <p className="mt-1 font-black text-text-strong">
            {formatNaira(rentDue)}
          </p>
        </div>
        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">
            Amount currently owing
          </p>
          <p className="mt-1 font-black text-text-strong">
            {formatNaira(amountOwing)}
          </p>
        </div>
        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Due date</p>
          <p className="mt-1 font-black text-text-strong">{formatDate(dueDate)}</p>
        </div>
        <div className="rounded-button bg-warning-soft p-4">
          <p className="text-sm font-bold text-warning">
            Amount tenant says they paid
          </p>
          <p className="mt-1 font-black text-text-strong">
            {formatNaira(claim.amountPaid)}
          </p>
        </div>
        <div className="rounded-button bg-warning-soft p-4">
          <p className="text-sm font-bold text-warning">Claimed payment date</p>
          <p className="mt-1 font-black text-text-strong">
            {formatDate(claim.paymentDate)}
          </p>
        </div>
      </div>

      <div className="rounded-card border border-border-soft bg-white p-4">
        <p className="font-black text-text-strong">Uploaded proof</p>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          Open the uploaded bank receipt or document before confirming.
        </p>
        {claim.proofUrl ? (
          <a
            href={claim.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block"
          >
            <Button type="button" variant="secondary">
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2.6} />
              View proof file
            </Button>
          </a>
        ) : (
          <p className="mt-4 rounded-button bg-background p-3 text-sm font-semibold text-text-muted">
            No proof file was uploaded.
          </p>
        )}
      </div>

      <div className="border-t border-border-soft pt-5">
        <PaymentClaimDecisionForms claimId={claim.id} />
      </div>
    </div>
  );
}
