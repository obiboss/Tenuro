import {
  MANAGER_COLLECTION_MODE_LABELS,
  MANAGER_MANAGEMENT_FEE_TYPE_LABELS,
  MANAGER_PAYMENT_RECEIVER_LABELS,
  MANAGER_PAYSTACK_CHARGE_BEARER_LABELS,
} from "@/constants/manager";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
} from "@/server/repositories/manager.repository";

type ManagerPropertyListProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
};

function formatFee(property: ManagerPropertyRow) {
  if (property.management_fee_type === "percentage") {
    return `${Number(property.management_fee_value).toLocaleString("en-NG")}%`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(property.management_fee_value));
}

export function ManagerPropertyList({
  landlordClients,
  properties,
}: ManagerPropertyListProps) {
  const landlordNameById = new Map(
    landlordClients.map((client) => [client.id, client.landlord_name]),
  );

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Properties
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          Each property keeps its own rent collection rule and management fee.
        </p>
      </div>

      {properties.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {properties.map((property) => (
            <article key={property.id} className="space-y-3 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-black text-text-strong">
                    {property.property_name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {landlordNameById.get(property.landlord_client_id) ??
                      "Landlord client"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    {property.property_address}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                  {property.status}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Collection Mode
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {MANAGER_COLLECTION_MODE_LABELS[property.collection_mode]}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Management Fee
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {
                      MANAGER_MANAGEMENT_FEE_TYPE_LABELS[
                        property.management_fee_type
                      ]
                    }{" "}
                    · {formatFee(property)}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Payment Receiver
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {MANAGER_PAYMENT_RECEIVER_LABELS[property.payment_receiver]}
                  </p>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Paystack Charge
                  </p>
                  <p className="mt-1 text-sm font-black text-text-strong">
                    {
                      MANAGER_PAYSTACK_CHARGE_BEARER_LABELS[
                        property.paystack_charge_bearer
                      ]
                    }
                  </p>
                </div>
              </div>

              <div className="rounded-card bg-primary-soft p-3">
                <p className="text-sm font-semibold leading-6 text-text-muted">
                  Amount Due to Landlord is calculated when a rent payment is
                  recorded using this property’s management fee rule.
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No property has been added yet.
          </p>
        </div>
      )}
    </section>
  );
}
