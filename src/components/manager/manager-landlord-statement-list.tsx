import {
  MANAGER_COLLECTION_MODE_LABELS,
  MANAGER_PAYMENT_RECEIVER_LABELS,
  MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS,
  MANAGER_REMITTANCE_STATUS_LABELS,
  MANAGER_RENT_PAYMENT_STATUS_LABELS,
} from "@/constants/manager";
import type {
  ManagerLandlordRemittanceRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerLandlordStatementListProps = {
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
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
  }).format(new Date(`${date}T00:00:00`));
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function ManagerLandlordStatementList({
  payments,
  remittances,
  properties,
  units,
  tenants,
}: ManagerLandlordStatementListProps) {
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
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Rent payment records
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Rent records linked to this landlord client.
          </p>
        </div>

        {payments.length > 0 ? (
          <div className="mt-4 divide-y divide-border-soft">
            {payments.map((payment) => {
              const proofUrl = getMetadataString(payment.metadata, "proof_url");

              return (
                <article key={payment.id} className="space-y-3 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-text-strong">
                        {tenantNameById.get(payment.tenant_id) ?? "Tenant"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {propertyNameById.get(payment.property_id) ??
                          "Property"}{" "}
                        · {unitLabelById.get(payment.unit_id) ?? "Unit"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                      {MANAGER_RENT_PAYMENT_STATUS_LABELS[payment.status]}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Amount paid
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {formatNaira(payment.amount_paid)}
                      </p>
                    </div>

                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Manager commission
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {formatNaira(payment.management_fee_amount)}
                      </p>
                    </div>

                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Amount due to landlord
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {formatNaira(payment.landlord_net_amount)}
                      </p>
                    </div>

                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Payment date
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Collection mode
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {
                          MANAGER_COLLECTION_MODE_LABELS[
                            payment.collection_mode
                          ]
                        }
                      </p>
                    </div>

                    <div className="rounded-card bg-surface p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Payment receiver
                      </p>
                      <p className="mt-1 text-sm font-black text-text-strong">
                        {
                          MANAGER_PAYMENT_RECEIVER_LABELS[
                            payment.payment_receiver
                          ]
                        }
                      </p>
                    </div>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Rent period
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatDate(payment.period_start)} —{" "}
                      {formatDate(payment.period_end)}
                    </p>
                  </div>

                  {proofUrl ? (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-black text-primary underline-offset-4 hover:underline"
                    >
                      View payment proof
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              No rent payment record is linked to this landlord yet.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Remittance records
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Money manually recorded as remitted to this landlord.
          </p>
        </div>

        {remittances.length > 0 ? (
          <div className="mt-4 divide-y divide-border-soft">
            {remittances.map((remittance) => (
              <article key={remittance.id} className="space-y-3 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-text-strong">
                      {formatNaira(remittance.amount_remitted)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {formatDate(remittance.remittance_date)}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {MANAGER_REMITTANCE_STATUS_LABELS[remittance.status]}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Method
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {
                        MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS[
                          remittance.payment_method
                        ]
                      }
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Reference
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {remittance.payment_reference ?? "Not added"}
                    </p>
                  </div>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Period
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {formatDate(remittance.period_start)} —{" "}
                    {formatDate(remittance.period_end)}
                  </p>
                </div>

                {remittance.proof_url ? (
                  <a
                    href={remittance.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-black text-primary underline-offset-4 hover:underline"
                  >
                    View remittance proof
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              No remittance record is linked to this landlord yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
