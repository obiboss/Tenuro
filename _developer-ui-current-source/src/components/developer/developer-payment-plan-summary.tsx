import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type {
  DeveloperPaymentPlanRow,
  DeveloperPaymentScheduleItemRow,
} from "@/server/repositories/developer-payment-plans.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperPaymentPlanSummaryProps = {
  saleId: string;
  plan: DeveloperPaymentPlanRow | null;
  scheduleItems: DeveloperPaymentScheduleItemRow[];
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function DeveloperPaymentPlanSummary({
  saleId,
  plan,
  scheduleItems,
}: DeveloperPaymentPlanSummaryProps) {
  if (!plan) {
    return (
      <SectionCard
        title="Payment Plan"
        description="No payment plan has been created for this sale yet."
        action={
          <Link
            href={`/developer/sales/${saleId}/payment-plan`}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            Create Payment Plan
          </Link>
        }
      >
        <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
          Create a payment plan before sending payment requests.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Payment Plan"
      description="Expected payment schedule for this locked sale."
      action={
        plan.status === "active" ? (
          <Link
            href={`/developer/sales/${saleId}/payment-request`}
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            Create Payment Request
          </Link>
        ) : null
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Plan total</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatNaira(Number(plan.total_amount))}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Mode</p>
          <p className="mt-2 text-xl font-black text-text-strong">
            {formatStatus(plan.payment_plan_mode)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Status</p>
          <div className="mt-2">
            <Badge tone="primary">{formatStatus(plan.status)}</Badge>
          </div>
        </div>
      </div>

      {scheduleItems.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-text-muted">
          No schedule items found.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 pr-4 font-black">Item</th>
                <th className="py-3 pr-4 font-black">Due Date</th>
                <th className="py-3 pr-4 font-black">Expected</th>
                <th className="py-3 pr-4 font-black">Paid</th>
                <th className="py-3 pr-4 font-black">Status</th>
              </tr>
            </thead>

            <tbody>
              {scheduleItems.map((item) => (
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
                  <td className="py-4 pr-4">
                    <Badge tone="primary">{formatStatus(item.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
