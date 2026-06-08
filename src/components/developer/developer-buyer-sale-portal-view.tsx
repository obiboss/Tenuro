import Link from "next/link";
import { CreditCard, FileText } from "lucide-react";
import { initiateBuyerPortalSchedulePaymentAction } from "@/actions/developer-buyer-portal.actions";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { getBuyerSalePortalByToken } from "@/server/services/developer-buyer-portal.service";
import { formatNaira } from "@/server/utils/money";

type BuyerPortalData = NonNullable<
  Awaited<ReturnType<typeof getBuyerSalePortalByToken>>
>;

type DeveloperBuyerSalePortalViewProps = {
  data: BuyerPortalData;
  token: string;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getScheduleBalance(item: BuyerPortalData["scheduleItems"][number]) {
  return Math.max(0, Number(item.expected_amount) - Number(item.amount_paid));
}

export function DeveloperBuyerSalePortalView({
  data,
  token,
}: DeveloperBuyerSalePortalViewProps) {
  const { sale, paymentPlan, scheduleItems, payments, summary } = data;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Plot and Sale Details"
        description="This is the plot and sale record linked to your payment schedule."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <tbody className="divide-y divide-border-soft">
              <tr>
                <th className="w-56 py-3 pr-4 font-black text-text-muted">
                  Buyer
                </th>
                <td className="py-3 font-semibold text-text-strong">
                  {sale.developer_buyers?.full_name ?? "Buyer"}
                </td>
              </tr>

              <tr>
                <th className="py-3 pr-4 font-black text-text-muted">Estate</th>
                <td className="py-3 font-semibold text-text-strong">
                  {sale.developer_estates?.estate_name ?? "Estate"}
                </td>
              </tr>

              <tr>
                <th className="py-3 pr-4 font-black text-text-muted">Plot</th>
                <td className="py-3 font-semibold text-text-strong">
                  Plot {sale.developer_plots?.plot_number ?? "—"} ·{" "}
                  {sale.developer_plots?.size_label ?? "—"}
                </td>
              </tr>

              <tr>
                <th className="py-3 pr-4 font-black text-text-muted">
                  Sale reference
                </th>
                <td className="py-3 font-semibold text-text-strong">
                  {sale.sale_reference}
                </td>
              </tr>

              <tr>
                <th className="py-3 pr-4 font-black text-text-muted">
                  Payment plan
                </th>
                <td className="py-3 font-semibold text-text-strong">
                  {formatStatus(
                    paymentPlan?.payment_plan_mode ?? sale.payment_plan_mode,
                  )}
                </td>
              </tr>

              <tr>
                <th className="py-3 pr-4 font-black text-text-muted">
                  Sale status
                </th>
                <td className="py-3">
                  <Badge tone="primary">{formatStatus(sale.status)}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-text-muted">Total price</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatNaira(summary.totalPrice)}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-text-muted">Paid so far</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatNaira(summary.totalPaid)}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-text-muted">Outstanding</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatNaira(summary.outstandingBalance)}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-text-muted">Next due</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatNaira(summary.nextDueAmount)}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {formatDate(summary.nextDueDate)}
          </p>
        </div>
      </div>

      <SectionCard
        title="Payment Schedule"
        description="Pay an unpaid schedule item securely through Paystack. The platform fee is calculated automatically before checkout."
      >
        {scheduleItems.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">
            No payment schedule has been created yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-210 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Payment Item</th>
                  <th className="py-3 pr-4 font-black">Due Date</th>
                  <th className="py-3 pr-4 font-black">Expected</th>
                  <th className="py-3 pr-4 font-black">Paid</th>
                  <th className="py-3 pr-4 font-black">Balance</th>
                  <th className="py-3 pr-4 font-black">Status</th>
                  <th className="py-3 pr-4 font-black">Action</th>
                </tr>
              </thead>

              <tbody>
                {scheduleItems.map((item) => {
                  const balance = getScheduleBalance(item);
                  const canPay =
                    balance > 0 &&
                    (item.status === "pending" ||
                      item.status === "part_paid" ||
                      item.status === "overdue");

                  return (
                    <tr key={item.id} className="border-b border-border-soft">
                      <td className="py-4 pr-4 font-black text-text-strong">
                        {item.label}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-text-muted">
                        {formatDate(item.due_date)}
                      </td>
                      <td className="py-4 pr-4 font-black text-text-strong">
                        {formatNaira(Number(item.expected_amount))}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-text-muted">
                        {formatNaira(Number(item.amount_paid))}
                      </td>
                      <td className="py-4 pr-4 font-black text-text-strong">
                        {formatNaira(balance)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge tone="primary">
                          {formatStatus(item.status)}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        {canPay ? (
                          <form
                            action={initiateBuyerPortalSchedulePaymentAction}
                          >
                            <input type="hidden" name="token" value={token} />
                            <input
                              type="hidden"
                              name="scheduleItemId"
                              value={item.id}
                            />

                            <button
                              type="submit"
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
                            >
                              <CreditCard aria-hidden="true" size={16} />
                              Pay Now
                            </button>
                          </form>
                        ) : (
                          <span className="text-sm font-semibold text-text-muted">
                            Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Payment History"
        description="Every confirmed payment for this plot will appear here with receipt access."
      >
        {payments.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">
            No confirmed payments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-230 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Date</th>
                  <th className="py-3 pr-4 font-black">Reference</th>
                  <th className="py-3 pr-4 font-black">Amount Paid</th>
                  <th className="py-3 pr-4 font-black">Platform Fee</th>
                  <th className="py-3 pr-4 font-black">Total Paid</th>
                  <th className="py-3 pr-4 font-black">Balance After</th>
                  <th className="py-3 pr-4 font-black">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border-soft">
                    <td className="py-4 pr-4 font-semibold text-text-muted">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="py-4 pr-4 font-black text-text-strong">
                      {payment.payment_reference}
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
                      {payment.receipt_path ? (
                        <Link
                          href={payment.receipt_path}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white"
                        >
                          <FileText aria-hidden="true" size={16} />
                          Download
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-text-muted">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
