import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { DeveloperBuyerPortalLinkForm } from "@/components/developer/developer-buyer-portal-link-form";
import { DeveloperPaymentPlanSummary } from "@/components/developer/developer-payment-plan-summary";
import type {
  DeveloperPaymentPlanRow,
  DeveloperPaymentScheduleItemRow,
} from "@/server/repositories/developer-payment-plans.repository";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperSaleDetailProps = {
  sale: DeveloperSaleWithDetails;
  paymentPlan: DeveloperPaymentPlanRow | null;
  scheduleItems: DeveloperPaymentScheduleItemRow[];
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function DeveloperSaleDetail({
  sale,
  paymentPlan,
  scheduleItems,
}: DeveloperSaleDetailProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Sale Summary"
        description="This sale price is locked and must not be silently edited."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Locked price</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {formatNaira(Number(sale.total_price_locked))}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Initial deposit</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {formatNaira(Number(sale.initial_deposit_amount))}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Status</p>
            <div className="mt-2">
              <Badge tone="primary">{formatStatus(sale.status)}</Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Buyer + Plot"
        description="Buyer and plot linked to this sale."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Buyer</p>
            <p className="mt-2 font-black text-text-strong">
              {sale.developer_buyers?.full_name ?? "Buyer"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_buyers?.phone_number ?? "—"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plot</p>
            <p className="mt-2 font-black text-text-strong">
              Plot {sale.developer_plots?.plot_number ?? "—"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_plots?.size_label ?? "—"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Estate</p>
            <p className="mt-2 font-black text-text-strong">
              {sale.developer_estates?.estate_name ?? "Estate"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_estates?.location ?? "—"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Payment mode</p>
            <p className="mt-2 font-black text-text-strong">
              {formatStatus(sale.payment_plan_mode)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Sale date: {formatDate(sale.sale_date)}
            </p>
          </div>
        </div>
      </SectionCard>

      <DeveloperPaymentPlanSummary
        saleId={sale.id}
        plan={paymentPlan}
        scheduleItems={scheduleItems}
      />

      {paymentPlan ? (
        <DeveloperBuyerPortalLinkForm
          saleId={sale.id}
          buyerName={sale.developer_buyers?.full_name ?? "Buyer"}
        />
      ) : null}

      <SectionCard
        title="Next Step"
        description="Buyer payment initiation and receipt PDF generation come next."
      >
        <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
          Next: D6B — let buyers pay unpaid schedule items directly from the
          portal, then post the payment to the ledger after Paystack
          verification.
        </div>
      </SectionCard>

      <Link
        href="/developer/sales"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Sales
      </Link>
    </div>
  );
}
