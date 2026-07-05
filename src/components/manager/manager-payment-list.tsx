import Link from "next/link";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPaymentListProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getPaymentStatusLabel(status: ManagerRentPaymentRow["status"]) {
  const labels: Record<ManagerRentPaymentRow["status"], string> = {
    recorded: "Recorded",
    pending_confirmation: "Awaiting confirmation",
    verified: "Verified",
    rejected: "Rejected",
    reversed: "Reversed",
  };

  return labels[status];
}

function getPaymentStatusClassName(status: ManagerRentPaymentRow["status"]) {
  if (status === "verified") {
    return "bg-success-soft text-success";
  }

  if (status === "recorded") {
    return "bg-primary-soft text-primary";
  }

  if (status === "pending_confirmation") {
    return "bg-warning-soft text-warning";
  }

  return "bg-danger-soft text-danger";
}

function canShareReceipt(status: ManagerRentPaymentRow["status"]) {
  return status === "verified" || status === "recorded";
}

export function ManagerPaymentList({
  landlordClients,
  properties,
  units,
  tenants,
  payments,
}: ManagerPaymentListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );
  const unitLabelById = new Map(
    units.map((unit) => [unit.id, unit.unit_label]),
  );
  const tenantNameById = new Map(
    tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Recent rent payments
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Receipts are created from saved payment records. No receipt details
          need to be typed manually.
        </p>
      </div>

      {payments.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {payments.map((payment) => (
            <article key={payment.id} className="space-y-3 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-text-strong">
                    {tenantNameById.get(payment.tenant_id) ?? "Tenant"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {propertyNameById.get(payment.property_id) ?? "Property"} ·{" "}
                    {unitLabelById.get(payment.unit_id) ?? "Unit"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-text-muted">
                    Landlord:{" "}
                    {landlordNameById.get(payment.landlord_client_id) ??
                      "Not available"}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getPaymentStatusClassName(
                    payment.status,
                  )}`}
                >
                  {getPaymentStatusLabel(payment.status)}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Amount paid
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatNaira(Number(payment.amount_paid))}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Manager fee
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatNaira(Number(payment.management_fee_amount))}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Landlord amount
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatNaira(Number(payment.landlord_net_amount))}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Payment date
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDate(payment.payment_date)}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Reference
                  </p>
                  <p className="mt-1 break-all text-sm font-black text-text-strong">
                    {payment.payment_reference ?? "Not stated"}
                  </p>
                </div>
              </div>

              {canShareReceipt(payment.status) ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/manager/receipts/${payment.id}/download`}
                    className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                  >
                    Download Receipt
                  </Link>

                  <Link
                    href={`/manager/receipts/${payment.id}/share`}
                    target="_blank"
                    className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Send via WhatsApp
                  </Link>
                </div>
              ) : (
                <p className="rounded-card bg-warning-soft p-3 text-sm font-semibold text-warning">
                  Receipt will be available after this payment is confirmed.
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No rent payment has been recorded yet.
          </p>
        </div>
      )}
    </section>
  );
}
