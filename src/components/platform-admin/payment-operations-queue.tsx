import Link from "next/link";
import { AlertTriangle, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";
import { PaymentOperationsFilters } from "@/components/platform-admin/payment-operations-filters";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/server/utils/money";
import type {
  PlatformAdminPaymentOperationListItem,
  PlatformAdminPaymentOperationsList,
} from "@/server/services/platform-admin-payments.service";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";

type PaymentOperationsQueueProps = {
  operations: PlatformAdminPaymentOperationsList;
};

const intentStatusCopy: Record<
  GatewayPaymentIntent["status"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "primary" }
> = {
  initialized: { label: "Initialized", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  abandoned: { label: "Abandoned", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function verificationLabel(
  phase: PlatformAdminPaymentOperationListItem["verificationPhase"],
) {
  if (phase === "settled") {
    return { label: "Verified", tone: "success" as const };
  }

  if (phase === "verifiable") {
    return { label: "Awaiting verification", tone: "warning" as const };
  }

  if (phase === "terminal_unpaid") {
    return { label: "Not successful", tone: "danger" as const };
  }

  return { label: "Unknown", tone: "neutral" as const };
}

function allocationLabel(
  summary: PlatformAdminPaymentOperationListItem["allocationSummary"],
) {
  if (summary.status === "paid") {
    return { label: "Allocations paid", tone: "success" as const };
  }

  if (summary.status === "pending") {
    return { label: "Allocations pending", tone: "warning" as const };
  }

  if (summary.status === "inconsistent") {
    return { label: "Allocation issue", tone: "danger" as const };
  }

  if (summary.status === "none") {
    return { label: "No allocations", tone: "neutral" as const };
  }

  return { label: "Mixed allocations", tone: "warning" as const };
}

function PaymentRow({ item }: { item: PlatformAdminPaymentOperationListItem }) {
  const status = intentStatusCopy[item.status];
  const verification = verificationLabel(item.verificationPhase);
  const allocation = allocationLabel(item.allocationSummary);

  return (
    <article
      className={cn(
        "rounded-card border border-border-soft bg-background p-4",
        item.needsAttention && "border-warning/35 bg-warning-soft/20",
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-text-strong">
              {item.paystackReference}
            </h3>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={verification.tone}>{verification.label}</Badge>
            <Badge tone={allocation.tone}>{allocation.label}</Badge>
            {item.needsAttention ? (
              <Badge tone="danger">Needs attention</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Tenant
              </p>
              <p className="mt-1 font-extrabold text-text-strong">
                {item.tenantName}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Landlord
              </p>
              <p className="mt-1 font-extrabold text-text-strong">
                {item.landlordName}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Total amount
              </p>
              <p className="mt-1 font-extrabold text-text-strong">
                {formatNaira(item.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Created
              </p>
              <p className="mt-1 font-extrabold text-text-strong">
                {formatDateTime(item.createdAt)}
              </p>
            </div>
          </div>

          {item.failureReason ? (
            <p className="text-sm leading-6 text-danger">{item.failureReason}</p>
          ) : null}
        </div>

        <Link
          href={`/admin/payments/${encodeURIComponent(item.paystackReference)}`}
          className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-hover"
        >
          View details
        </Link>
      </div>
    </article>
  );
}

function PaginationControls({
  operations,
}: {
  operations: PlatformAdminPaymentOperationsList;
}) {
  const { page, totalPages } = operations.pagination;
  const status = operations.filters.status;
  const query = operations.filters.query;

  if (totalPages <= 1) {
    return null;
  }

  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-bold text-text-muted">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        {previousPage ? (
          <Link
            href={`/admin/payments?${new URLSearchParams({
              ...(status && status !== "all" ? { status } : {}),
              ...(query ? { q: query } : {}),
              page: String(previousPage),
            }).toString()}`}
            className="rounded-button border border-border-soft bg-background px-4 py-2 text-sm font-bold text-text-strong hover:bg-surface"
          >
            Previous
          </Link>
        ) : null}

        {nextPage ? (
          <Link
            href={`/admin/payments?${new URLSearchParams({
              ...(status && status !== "all" ? { status } : {}),
              ...(query ? { q: query } : {}),
              page: String(nextPage),
            }).toString()}`}
            className="rounded-button border border-border-soft bg-background px-4 py-2 text-sm font-bold text-text-strong hover:bg-surface"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentOperationsQueue({
  operations,
}: PaymentOperationsQueueProps) {
  const { summaries } = operations;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card bg-warning-soft p-5 text-warning shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Needs attention</p>
              <p className="mt-1 text-2xl font-black">
                {summaries.payments.attention}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Failed, abandoned, or paid without linked rent records.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-primary-soft p-5 text-primary shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <ReceiptText aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Initialized</p>
              <p className="mt-1 text-2xl font-black">
                {summaries.payments.initialized}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Payment links started but not yet settled.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-success-soft p-5 text-success shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Paid intents</p>
              <p className="mt-1 text-2xl font-black">{summaries.payments.paid}</p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Gateway payments marked as paid in BOPA.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-danger-soft p-5 text-danger shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold">Payout verification</p>
              <p className="mt-1 text-2xl font-black">
                {summaries.payouts.pending}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-normal">
                Pending payout accounts · {summaries.payouts.failed} failed
              </p>
            </div>
          </div>
        </div>
      </div>

      <PaymentOperationsFilters filters={operations.filters} />

      <SectionCard
        title="Payment operations"
        description="Read-only gateway payment monitoring for troubleshooting and financial oversight."
        action={
          <Badge tone="primary">{operations.pagination.totalCount} total</Badge>
        }
        contentClassName="space-y-4"
      >
        {operations.items.length === 0 ? (
          <EmptyState
            title="No payments match this view"
            description="Try another status filter or search by Paystack reference."
            icon={<CreditCard aria-hidden="true" size={24} strokeWidth={2.6} />}
            className="bg-background shadow-none"
          />
        ) : (
          operations.items.map((item) => (
            <PaymentRow key={item.id} item={item} />
          ))
        )}

        <PaginationControls operations={operations} />
      </SectionCard>
    </div>
  );
}
