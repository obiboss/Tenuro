import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/server/utils/money";
import type { CaretakerPaymentClaimView } from "@/server/services/caretaker-payment-claims.service";

type PendingPaymentClaimsPanelProps = {
  claims: CaretakerPaymentClaimView[];
};

function formatTimeAgo(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );

  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}

export function PendingPaymentClaimsPanel({
  claims,
}: PendingPaymentClaimsPanelProps) {
  if (claims.length === 0) {
    return (
      <div className="rounded-card border border-border-soft bg-white p-5">
        <h2 className="text-lg font-black text-text-strong">
          Nothing to confirm right now
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Payments submitted by tenants will appear here for you to check.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <article
          key={claim.id}
          className="flex flex-col gap-4 rounded-card border border-border-soft bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black text-text-strong">{claim.tenantName}</h2>
              <Badge tone="warning">Waiting for confirmation</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {claim.propertyUnitLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-text-muted">
              <span>
                Claimed: {formatNaira(claim.amountPaid)}
              </span>
              <span>{formatTimeAgo(claim.submittedAt)}</span>
            </div>
          </div>

          <Link href={`/payments/claims/${claim.id}`} className="shrink-0">
            <Button fullWidth>Confirm payment</Button>
          </Link>
        </article>
      ))}
    </div>
  );
}
