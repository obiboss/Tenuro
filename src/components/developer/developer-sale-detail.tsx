import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { DeveloperBuyerPortalLinkForm } from "@/components/developer/developer-buyer-portal-link-form";
import { DeveloperPaymentPlanSummary } from "@/components/developer/developer-payment-plan-summary";
import type {
  DeveloperPaymentPlanRow,
  DeveloperPaymentScheduleItemRow,
} from "@/server/repositories/developer-payment-plans.repository";
import type { DeveloperSalePaymentRow } from "@/server/repositories/developer-sale-payments.repository";
import type { DeveloperSaleWithDetails } from "@/server/repositories/developer-sales.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperSaleDocumentView = {
  id: string;
  document_type: string;
  storage_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
} | null;

type DeveloperSaleDetailProps = {
  sale: DeveloperSaleWithDetails;
  paymentPlan: DeveloperPaymentPlanRow | null;
  scheduleItems: DeveloperPaymentScheduleItemRow[];
  payments: DeveloperSalePaymentRow[];
  salesAgreementDocument: DeveloperSaleDocumentView;
  allocationLetterDocument: DeveloperSaleDocumentView;
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPostedPayments(payments: DeveloperSalePaymentRow[]) {
  return payments.filter((payment) => payment.status === "posted");
}

function getTotalPaid(payments: DeveloperSalePaymentRow[]) {
  return getPostedPayments(payments).reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );
}

function getOutstandingBalance(params: {
  sale: DeveloperSaleWithDetails;
  payments: DeveloperSalePaymentRow[];
}) {
  return Math.max(
    0,
    Number(params.sale.total_price_locked) - getTotalPaid(params.payments),
  );
}

function getDocumentStatus(document: DeveloperSaleDocumentView) {
  if (!document) {
    return "Not generated";
  }

  return formatStatus(document.status);
}

export function DeveloperSaleDetail({
  sale,
  paymentPlan,
  scheduleItems,
  payments,
  salesAgreementDocument,
  allocationLetterDocument,
}: DeveloperSaleDetailProps) {
  const totalPaid = getTotalPaid(payments);
  const outstandingBalance = getOutstandingBalance({ sale, payments });
  const latestPostedPayment = getPostedPayments(payments)[0] ?? null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Buyer details and payment summary"
        description="This page shows the buyer, plot, payment schedule, transactions, receipts, and outstanding balance."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Buyer</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {sale.developer_buyers?.full_name ?? "Buyer"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_buyers?.phone_number ?? "—"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_buyers?.email ?? "No email saved"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Locked price</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {formatNaira(Number(sale.total_price_locked))}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {formatStatus(sale.payment_plan_mode)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Paid so far</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {formatNaira(totalPaid)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Last payment:{" "}
              {latestPostedPayment
                ? formatDate(latestPostedPayment.payment_date)
                : "None yet"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Outstanding</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {formatNaira(outstandingBalance)}
            </p>
            <div className="mt-2">
              <Badge tone="primary">{formatStatus(sale.status)}</Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Plot and sale record"
        description="Buyer, estate, plot, and locked sale information."
      >
        <div className="grid gap-4 md:grid-cols-2">
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
            <p className="text-sm font-bold text-text-muted">Plot</p>
            <p className="mt-2 font-black text-text-strong">
              Plot {sale.developer_plots?.plot_number ?? "—"}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {sale.developer_plots?.size_label ?? "—"}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Sale reference</p>
            <p className="mt-2 font-black text-text-strong">
              {sale.sale_reference}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Sale date: {formatDate(sale.sale_date)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Expected finish</p>
            <p className="mt-2 font-black text-text-strong">
              {formatDate(sale.expected_completion_date)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Initial deposit:{" "}
              {formatNaira(Number(sale.initial_deposit_amount))}
            </p>
          </div>
        </div>
      </SectionCard>

      <DeveloperPaymentPlanSummary
        saleId={sale.id}
        plan={paymentPlan}
        scheduleItems={scheduleItems}
      />

      <SectionCard
        title="Buyer transactions"
        description="Verified payments posted to this buyer’s sale record."
      >
        {payments.length === 0 ? (
          <div className="rounded-button bg-background p-5 text-sm font-semibold leading-6 text-text-muted">
            No payment has been posted for this buyer yet. When the buyer pays
            through BOPA, verified transactions and receipt status will appear
            here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-230 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Payment date</th>
                  <th className="py-3 pr-4 font-black">Reference</th>
                  <th className="py-3 pr-4 font-black">Amount paid</th>
                  <th className="py-3 pr-4 font-black">BOPA fee</th>
                  <th className="py-3 pr-4 font-black">Total paid</th>
                  <th className="py-3 pr-4 font-black">Balance after</th>
                  <th className="py-3 pr-4 font-black">Receipt</th>
                  <th className="py-3 pr-4 font-black">Status</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border-soft">
                    <td className="py-4 pr-4 font-semibold text-text-strong">
                      {formatDateTime(payment.payment_date)}
                    </td>

                    <td className="py-4 pr-4">
                      <p className="font-black text-primary">
                        {payment.payment_reference}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {payment.payment_method}
                      </p>
                    </td>

                    <td className="py-4 pr-4 font-black text-text-strong">
                      {formatNaira(Number(payment.amount_paid))}
                    </td>

                    <td className="py-4 pr-4 font-semibold text-text-muted">
                      {formatNaira(Number(payment.platform_fee_amount))}
                    </td>

                    <td className="py-4 pr-4 font-black text-text-strong">
                      {formatNaira(Number(payment.total_paid_amount))}
                    </td>

                    <td className="py-4 pr-4 font-black text-text-strong">
                      {formatNaira(Number(payment.balance_after))}
                    </td>

                    <td className="py-4 pr-4">
                      {payment.receipt_generated ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-success">
                          <ReceiptText
                            aria-hidden="true"
                            size={17}
                            strokeWidth={2.6}
                          />
                          {payment.receipt_number ?? "Generated"}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-text-muted">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-4 pr-4">
                      <Badge
                        tone={
                          payment.status === "posted" ? "success" : "warning"
                        }
                      >
                        {formatStatus(payment.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Sale documents"
        description="Document records connected to this buyer’s sale."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Sales agreement</p>
            <p className="mt-2 font-black text-text-strong">
              {getDocumentStatus(salesAgreementDocument)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">
              Allocation letter
            </p>
            <p className="mt-2 font-black text-text-strong">
              {getDocumentStatus(allocationLetterDocument)}
            </p>
          </div>
        </div>
      </SectionCard>

      {paymentPlan ? (
        <DeveloperBuyerPortalLinkForm
          saleId={sale.id}
          buyerName={sale.developer_buyers?.full_name ?? "Buyer"}
        />
      ) : null}

      <Link
        href="/developer/sales"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Sales
      </Link>
    </div>
  );
}
