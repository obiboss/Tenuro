import { CreditCard, FileCheck2, FileLock2, FileText } from "lucide-react";
import { initiateBuyerPortalSchedulePaymentAction } from "@/actions/developer-buyer-portal.actions";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { getBuyerSalePortalByToken } from "@/server/services/developer-buyer-portal.service";
import { formatNaira } from "@/server/utils/money";

type BuyerPortalData = NonNullable<
  Awaited<ReturnType<typeof getBuyerSalePortalByToken>>
>;

type ScheduleItem = BuyerPortalData["scheduleItems"][number];

type DeveloperBuyerSalePortalViewProps = {
  data: BuyerPortalData;
  token: string;
};

const OUTSTANDING_STATUSES = new Set(["pending", "part_paid", "overdue"]);

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

function getDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const directDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directDateMatch) {
    return `${directDateMatch[1]}-${directDateMatch[2]}-${directDateMatch[3]}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsedDate);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getScheduleBalance(item: ScheduleItem) {
  return Math.max(0, Number(item.expected_amount) - Number(item.amount_paid));
}

function isOutstandingItem(item: ScheduleItem) {
  return getScheduleBalance(item) > 0 && OUTSTANDING_STATUSES.has(item.status);
}

function compareScheduleItemsByDueDate(
  left: ScheduleItem,
  right: ScheduleItem,
) {
  const leftDate = getDateKey(left.due_date) ?? "9999-12-31";
  const rightDate = getDateKey(right.due_date) ?? "9999-12-31";

  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  return left.label.localeCompare(right.label);
}

function getNextOutstandingItem(scheduleItems: ScheduleItem[]) {
  return scheduleItems
    .filter(isOutstandingItem)
    .sort(compareScheduleItemsByDueDate)[0];
}

function isDueNow(item: ScheduleItem | undefined) {
  if (!item) {
    return false;
  }

  const dueDate = getDateKey(item.due_date);

  if (!dueDate) {
    return true;
  }

  const today = getTodayDateKey();

  return Boolean(today) && dueDate <= today;
}

function getDocumentTone(
  availability: BuyerPortalData["documents"][number]["availability"],
) {
  if (availability === "available") {
    return "success";
  }

  if (availability === "locked") {
    return "warning";
  }

  return "primary";
}

function DocumentIcon({
  availability,
}: {
  availability: BuyerPortalData["documents"][number]["availability"];
}) {
  if (availability === "available") {
    return <FileCheck2 aria-hidden="true" size={20} />;
  }

  if (availability === "locked") {
    return <FileLock2 aria-hidden="true" size={20} />;
  }

  return <FileText aria-hidden="true" size={20} />;
}

function PaymentAction({
  item,
  token,
  nextPayableItem,
  nextOutstandingItem,
}: {
  item: ScheduleItem;
  token: string;
  nextPayableItem: ScheduleItem | undefined;
  nextOutstandingItem: ScheduleItem | undefined;
}) {
  const balance = getScheduleBalance(item);

  if (balance <= 0 || item.status === "paid") {
    return <span className="text-sm font-semibold text-success">Paid</span>;
  }

  if (nextPayableItem?.id === item.id) {
    return (
      <form action={initiateBuyerPortalSchedulePaymentAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="scheduleItemId" value={item.id} />

        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          <CreditCard aria-hidden="true" size={16} />
          Pay Now
        </button>
      </form>
    );
  }

  if (nextOutstandingItem?.id === item.id && !isDueNow(item)) {
    return (
      <span className="text-sm font-semibold text-text-muted">
        Opens on due date
      </span>
    );
  }

  if (nextOutstandingItem && item.id !== nextOutstandingItem.id) {
    return (
      <span className="text-sm font-semibold text-text-muted">Upcoming</span>
    );
  }

  return (
    <span className="text-sm font-semibold text-text-muted">Not payable</span>
  );
}

function NextPaymentPanel({
  token,
  nextOutstandingItem,
  nextPayableItem,
}: {
  token: string;
  nextOutstandingItem: ScheduleItem | undefined;
  nextPayableItem: ScheduleItem | undefined;
}) {
  if (!nextOutstandingItem) {
    return (
      <SectionCard
        title="Next Payment"
        description="Your payment schedule is fully settled."
      >
        <div className="rounded-button bg-success-soft p-4 text-sm font-semibold leading-6 text-success">
          There is no outstanding installment to pay at the moment.
        </div>
      </SectionCard>
    );
  }

  const balance = getScheduleBalance(nextOutstandingItem);
  const dueNow = isDueNow(nextOutstandingItem);

  return (
    <SectionCard
      title="Next Payment"
      description="Only the next due installment can be paid from this portal."
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-button bg-background p-4">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            {nextOutstandingItem.label}
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {formatNaira(balance)}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-muted">
            Due date:{" "}
            <span className="font-black text-text-strong">
              {formatDate(nextOutstandingItem.due_date)}
            </span>
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            Status:{" "}
            <span className="font-black text-text-strong">
              {dueNow ? "Due now" : "Upcoming"}
            </span>
          </p>
        </div>

        {nextPayableItem ? (
          <form action={initiateBuyerPortalSchedulePaymentAction}>
            <input type="hidden" name="token" value={token} />
            <input
              type="hidden"
              name="scheduleItemId"
              value={nextPayableItem.id}
            />

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover md:w-auto"
            >
              <CreditCard aria-hidden="true" size={18} />
              Pay next installment
            </button>
          </form>
        ) : (
          <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
            This installment is not due yet. The payment button will appear on
            the due date.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function DeveloperBuyerSalePortalView({
  data,
  token,
}: DeveloperBuyerSalePortalViewProps) {
  const { sale, paymentPlan, scheduleItems, payments, documents, summary } =
    data;

  const nextOutstandingItem = getNextOutstandingItem(scheduleItems);
  const nextPayableItem =
    nextOutstandingItem && isDueNow(nextOutstandingItem)
      ? nextOutstandingItem
      : undefined;

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
            {nextOutstandingItem
              ? formatNaira(getScheduleBalance(nextOutstandingItem))
              : formatNaira(0)}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {formatDate(nextOutstandingItem?.due_date ?? null)}
          </p>
        </div>
      </div>

      <NextPaymentPanel
        token={token}
        nextOutstandingItem={nextOutstandingItem}
        nextPayableItem={nextPayableItem}
      />

      <SectionCard
        title="Sale Documents"
        description="Digital copies shown here are for reference, record, printing, and signing. Original physical documents remain developer-issued."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <div
              key={document.type}
              className="rounded-button border border-border-soft bg-background p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <DocumentIcon availability={document.availability} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black text-text-strong">
                      {document.label}
                    </p>
                    <Badge tone={getDocumentTone(document.availability)}>
                      {document.statusLabel}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                    {document.description}
                  </p>

                  <p className="mt-2 text-xs font-bold leading-5 text-text-muted">
                    {document.note}
                  </p>

                  {document.downloadUrl ? (
                    <a
                      href={document.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
                    >
                      <FileText aria-hidden="true" size={16} />
                      Download Copy
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
          This portal does not replace the developer’s physical original
          document handover process. Final original documents remain subject to
          full payment, verification, signing, and developer release.
        </div>
      </SectionCard>

      <SectionCard
        title="Full Payment Schedule"
        description="The full schedule is shown for transparency. Only the next due installment can be paid."
      >
        {scheduleItems.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">
            No payment schedule has been created yet.
          </p>
        ) : (
          <details className="group rounded-button border border-border-soft bg-background">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-extrabold text-text-strong">
              <span>View full payment schedule</span>
              <span className="text-xs font-black uppercase tracking-wide text-primary">
                {scheduleItems.length} items
              </span>
            </summary>

            <div className="border-t border-border-soft p-4">
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
                      const isCurrentNextItem =
                        nextOutstandingItem?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={
                            isCurrentNextItem
                              ? "border-b border-primary/20 bg-primary-soft/40"
                              : "border-b border-border-soft"
                          }
                        >
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
                            <Badge
                              tone={
                                item.status === "paid"
                                  ? "success"
                                  : isCurrentNextItem
                                    ? "primary"
                                    : "primary"
                              }
                            >
                              {isCurrentNextItem && item.status !== "paid"
                                ? isDueNow(item)
                                  ? "Due now"
                                  : "Upcoming"
                                : formatStatus(item.status)}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4">
                            <PaymentAction
                              item={item}
                              token={token}
                              nextPayableItem={nextPayableItem}
                              nextOutstandingItem={nextOutstandingItem}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
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
            <table className="w-full min-w-210 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Date</th>
                  <th className="py-3 pr-4 font-black">Reference</th>
                  <th className="py-3 pr-4 font-black">Amount Paid</th>
                  <th className="py-3 pr-4 font-black">BOPA Processing Fee</th>
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
                      {payment.receiptDownloadUrl ? (
                        <a
                          href={payment.receiptDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white"
                        >
                          <FileText aria-hidden="true" size={16} />
                          Download
                        </a>
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
