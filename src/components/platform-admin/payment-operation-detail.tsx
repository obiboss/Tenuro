import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { formatNaira } from "@/server/utils/money";
import type { PlatformAdminPaymentOperationDetail } from "@/server/services/platform-admin-payments.service";

type PaymentOperationDetailProps = {
  detail: PlatformAdminPaymentOperationDetail;
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

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold wrap-break-word text-text-strong">
        {value || "Not available"}
      </p>
    </div>
  );
}

function MetadataGrid({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm leading-6 text-text-muted">
        No operational metadata recorded.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <DetailField
          key={key}
          label={key.replaceAll("_", " ")}
          value={
            typeof value === "string" || typeof value === "number"
              ? String(value)
              : JSON.stringify(value)
          }
        />
      ))}
    </div>
  );
}

export function PaymentOperationDetail({ detail }: PaymentOperationDetailProps) {
  const { intent } = detail;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
        Back to payment operations
      </Link>

      {detail.needsAttention ? (
        <div className="rounded-card border border-warning/35 bg-warning-soft/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-warning"
              size={20}
              strokeWidth={2.6}
            />
            <div>
              <p className="font-black text-text-strong">Operational attention</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-text-muted">
                {detail.attentionReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{intent.status}</Badge>
        <Badge tone="neutral">{detail.verificationPhase}</Badge>
        <Badge
          tone={
            detail.allocationSummary.hasInconsistency ? "danger" : "success"
          }
        >
          {detail.allocationSummary.status}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Payment intent"
          description="Gateway payment record and Paystack reference details."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="Reference" value={intent.paystack_reference} />
            <DetailField label="Intent ID" value={intent.id} />
            <DetailField label="Tenant" value={detail.tenantName} />
            <DetailField label="Landlord" value={detail.landlordName} />
            <DetailField
              label="Rent amount"
              value={formatNaira(Number(intent.rent_amount))}
            />
            <DetailField
              label="Total amount"
              value={formatNaira(Number(intent.total_amount))}
            />
            <DetailField
              label="Platform fee"
              value={formatNaira(Number(intent.tenuro_fee_amount))}
            />
            <DetailField label="Currency" value={intent.currency_code} />
            <DetailField label="Created" value={formatDateTime(intent.created_at)} />
            <DetailField label="Paid at" value={formatDateTime(intent.paid_at ?? null)} />
            <DetailField
              label="Processed payment ID"
              value={intent.processed_payment_id ?? null}
            />
            <DetailField label="Failure reason" value={intent.failure_reason ?? null} />
          </div>
        </SectionCard>

        <SectionCard
          title="Linked rent payment"
          description="Posted rent payment and receipt state when available."
        >
          {detail.rentPayment ? (
            <div className="grid gap-4">
              <DetailField label="Payment ID" value={detail.rentPayment.id} />
              <DetailField
                label="Amount paid"
                value={formatNaira(Number(detail.rentPayment.amount_paid))}
              />
              <DetailField
                label="Receipt number"
                value={detail.rentPayment.receipt_number}
              />
              <DetailField
                label="Receipt status"
                value={detail.rentPayment.receipt_status}
              />
              <DetailField
                label="Payment date"
                value={formatDateTime(detail.rentPayment.payment_date)}
              />
            </div>
          ) : (
            <p className="text-sm leading-6 text-text-muted">
              No linked rent payment record yet.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Allocations"
        description="Split allocation rows for landlord, agent, and platform shares."
        action={
          <Badge tone="primary">{detail.allocations.length} rows</Badge>
        }
        contentClassName="space-y-4"
      >
        {detail.allocationSummary.inconsistencyReason ? (
          <p className="text-sm leading-6 text-danger">
            {detail.allocationSummary.inconsistencyReason}
          </p>
        ) : null}

        {detail.allocations.length === 0 ? (
          <p className="text-sm leading-6 text-text-muted">
            No allocations were created for this payment intent.
          </p>
        ) : (
          detail.allocations.map((allocation) => (
            <article
              key={allocation.id}
              className="rounded-card border border-border-soft bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black capitalize text-text-strong">
                  {allocation.recipient_type}
                </p>
                <Badge tone="neutral">{allocation.allocation_status}</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <DetailField
                  label="Amount"
                  value={formatNaira(Number(allocation.amount))}
                />
                <DetailField
                  label="Rent payment ID"
                  value={allocation.rent_payment_id}
                />
                <DetailField
                  label="Updated"
                  value={formatDateTime(allocation.updated_at)}
                />
              </div>
            </article>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Webhook and verification history"
        description="Paystack webhook processing timeline for this reference."
        action={<Badge tone="primary">{detail.events.length} events</Badge>}
        contentClassName="space-y-4"
      >
        {detail.events.length === 0 ? (
          <p className="text-sm leading-6 text-text-muted">
            No webhook events recorded for this reference yet.
          </p>
        ) : (
          detail.events.map((event) => (
            <article
              key={event.id}
              className="rounded-card border border-border-soft bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-text-strong">{event.eventType}</p>
                <Badge tone="neutral">{event.processingStatus}</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <DetailField
                  label="Received"
                  value={formatDateTime(event.createdAt)}
                />
                <DetailField
                  label="Processed"
                  value={formatDateTime(event.processedAt)}
                />
                <DetailField
                  label="Processed payment ID"
                  value={event.processedPaymentId}
                />
                <DetailField label="Error" value={event.errorMessage} />
              </div>
            </article>
          ))
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Operational metadata"
          description="Business context captured when the payment link was created."
        >
          <MetadataGrid metadata={detail.operationalMetadata} />
        </SectionCard>

        <SectionCard
          title="Paystack verification payload"
          description="Sanitized verification payload stored after Paystack confirmation."
        >
          <MetadataGrid metadata={detail.paystackMetadata} />
        </SectionCard>
      </div>
    </div>
  );
}
