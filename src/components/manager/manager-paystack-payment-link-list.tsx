import type { ManagerRentPaymentRequestRow } from "@/server/repositories/manager-paystack.repository";
import type {
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPaystackPaymentLinkListProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  paymentRequests: ManagerRentPaymentRequestRow[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusLabel(status: ManagerRentPaymentRequestRow["status"]) {
  const labels: Record<ManagerRentPaymentRequestRow["status"], string> = {
    pending: "Pending",
    initialized: "Ready",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  return labels[status];
}

function buildWhatsAppUrl(params: {
  phoneNumber: string;
  tenantName: string;
  amount: number;
  paymentUrl: string;
}) {
  const cleanedPhone = params.phoneNumber.replace(/\D/g, "");
  const phone =
    cleanedPhone.startsWith("234") || cleanedPhone.startsWith("1")
      ? cleanedPhone
      : `234${cleanedPhone.replace(/^0/, "")}`;

  const message = [
    `Hello ${params.tenantName},`,
    "",
    `Your BOPA rent payment link is ready.`,
    `Amount: ${formatNaira(params.amount)}`,
    "",
    params.paymentUrl,
    "",
    "Please pay through this secure Paystack link.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function ManagerPaystackPaymentLinkList({
  properties,
  units,
  tenants,
  paymentRequests,
}: ManagerPaystackPaymentLinkListProps) {
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );
  const unitLabelById = new Map(
    units.map((unit) => [unit.id, unit.unit_label]),
  );
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Paystack payment links
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Links become verified only after central Paystack confirmation.
        </p>
      </div>

      {paymentRequests.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {paymentRequests.map((request) => {
            const tenant = tenantById.get(request.tenant_id);
            const tenantName =
              tenant?.full_name ?? request.tenant_name_snapshot;

            return (
              <article key={request.id} className="space-y-3 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-text-strong">{tenantName}</p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {propertyNameById.get(request.property_id) ?? "Property"}{" "}
                      · {unitLabelById.get(request.unit_id) ?? "Unit"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Amount
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(request.amount_requested)}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Manager fee
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(request.management_fee_amount)}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Landlord share
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(request.landlord_net_amount)}
                    </p>
                  </div>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDateTime(request.created_at)}
                  </p>
                </div>

                {request.authorization_url &&
                request.status === "initialized" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={buildWhatsAppUrl({
                        phoneNumber:
                          tenant?.phone_number ?? request.tenant_phone_snapshot,
                        tenantName,
                        amount: Number(request.amount_requested),
                        paymentUrl: request.authorization_url,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                    >
                      Send via WhatsApp
                    </a>

                    <a
                      href={request.authorization_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                    >
                      Open Paystack Link
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No Paystack payment link has been created yet.
          </p>
        </div>
      )}
    </section>
  );
}
