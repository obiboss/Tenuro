import Link from "next/link";
import {
  generateAllocationLetterAction,
  generateSalesAgreementAction,
} from "@/actions/developer-sale-documents.actions";
import { DeveloperBuyerPortalLinkForm } from "@/components/developer/developer-buyer-portal-link-form";
import { DeveloperPaymentPlanSummary } from "@/components/developer/developer-payment-plan-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type {
  DeveloperPaymentPlanRow,
  DeveloperPaymentScheduleItemRow,
} from "@/server/repositories/developer-payment-plans.repository";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import type { DeveloperSaleDocumentView } from "@/server/services/developer-sale-documents.service";
import { formatNaira } from "@/server/utils/money";

type DeveloperSaleDetailProps = {
  sale: DeveloperSaleWithDetails;
  paymentPlan: DeveloperPaymentPlanRow | null;
  scheduleItems: DeveloperPaymentScheduleItemRow[];
  salesAgreementDocument: DeveloperSaleDocumentView | null;
  allocationLetterDocument: DeveloperSaleDocumentView | null;
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

function SaleDocumentRow({
  title,
  description,
  document,
  action,
  buttonLabel,
  regenerateLabel,
  saleId,
}: {
  title: string;
  description: string;
  document: DeveloperSaleDocumentView | null;
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
  regenerateLabel: string;
  saleId: string;
}) {
  return (
    <div className="rounded-button border border-border-soft bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-text-strong">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            {description}
          </p>

          {document ? (
            <p className="mt-2 text-xs font-bold text-success">
              Generated on {formatDate(document.generated_at)}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-text-muted">
              Not generated yet.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {document?.signedUrl ? (
            <a
              href={document.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
            >
              Download Copy
            </a>
          ) : null}

          <form action={action}>
            <input type="hidden" name="saleId" value={saleId} />
            <Button type="submit">
              {document ? regenerateLabel : buttonLabel}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DeveloperSaleDetail({
  sale,
  paymentPlan,
  scheduleItems,
  salesAgreementDocument,
  allocationLetterDocument,
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
        title="Sale Documents"
        description="Generate and manage digital document copies. Physical originals remain developer-issued."
      >
        <div className="space-y-4">
          <SaleDocumentRow
            title="Sales Agreement"
            description="Digital copy for buyer review, printing, signing, and hard-copy processing."
            document={salesAgreementDocument}
            action={generateSalesAgreementAction}
            buttonLabel="Generate Sales Agreement"
            regenerateLabel="Regenerate Sales Agreement"
            saleId={sale.id}
          />

          <SaleDocumentRow
            title="Allocation Letter"
            description="Digital copy confirming administrative plot allocation, subject to payment and handover rules."
            document={allocationLetterDocument}
            action={generateAllocationLetterAction}
            buttonLabel="Generate Allocation Letter"
            regenerateLabel="Regenerate Allocation Letter"
            saleId={sale.id}
          />
        </div>

        <div className="mt-4 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
          Digital copies are for reference, record, printing, and signing. They
          do not replace original physical documents issued by the developer.
        </div>
      </SectionCard>

      <SectionCard
        title="Next Step"
        description="Buyer portal document checklist comes next."
      >
        <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
          Next: D8E — show buyer-visible document checklist and download links
          inside the buyer sale portal.
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
