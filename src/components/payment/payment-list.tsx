import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNaira } from "@/server/utils/money";
import type { RentPaymentRow } from "@/server/repositories/payments.repository";

type PaymentListProps = {
  payments: RentPaymentRow[];
  emptyTitle?: string;
  emptyDescription?: string;
};

function paymentMethodLabel(method: RentPaymentRow["payment_method"]) {
  if (method === "bank_transfer") {
    return "Bank Transfer";
  }

  if (method === "cash") {
    return "Cash";
  }

  if (method === "paystack_gateway") {
    return "Paystack";
  }

  return "Other";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getUnitLabel(payment: RentPaymentRow) {
  const buildingName = payment.tenancies?.units?.building_name;
  const unitIdentifier = payment.tenancies?.units?.unit_identifier ?? "Unit";

  return buildingName ? `${buildingName} · ${unitIdentifier}` : unitIdentifier;
}

function getPaymentPeriod(payment: RentPaymentRow) {
  if (payment.payment_for_period_start && payment.payment_for_period_end) {
    return `${formatDate(payment.payment_for_period_start)} - ${formatDate(
      payment.payment_for_period_end,
    )}`;
  }

  return formatDate(payment.payment_date);
}

export function PaymentList({
  payments,
  emptyTitle = "No payments recorded yet",
  emptyDescription = "When you record rent payments, they will appear here with receipt status.",
}: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <Card key={payment.id}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-extrabold text-text-strong">
                  {payment.tenants?.full_name ?? "Tenant"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {getUnitLabel(payment)}
                </p>
              </div>

              <Badge tone={payment.status === "posted" ? "success" : "danger"}>
                {payment.status === "posted" ? "Posted" : "Reversed"}
              </Badge>
            </div>

            <div className="rounded-button bg-background p-3">
              <p className="text-lg font-extrabold text-text-strong">
                {formatNaira(payment.amount_paid)}
              </p>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                {paymentMethodLabel(payment.payment_method)} ·{" "}
                {getPaymentPeriod(payment)}
              </p>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                {payment.tenancies?.units?.properties?.property_name ??
                  "Property"}
              </p>

              {payment.payment_reference ? (
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  Ref: {payment.payment_reference}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
