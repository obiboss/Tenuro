import { MANAGER_TENANT_STATUS_LABELS } from "@/constants/manager";
import type {
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerTenantListProps = {
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

function getTenantRentSignal(tenant: ManagerTenantRow) {
  if (Number(tenant.current_balance) > 0) {
    return {
      label: "Owing",
      className: "bg-danger-soft text-danger",
    };
  }

  if (!tenant.next_rent_due_date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${tenant.next_rent_due_date}T00:00:00`);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilDue >= 0 && daysUntilDue <= 30) {
    return {
      label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      className: "bg-warning-soft text-warning",
    };
  }

  return null;
}

export function ManagerTenantList({
  properties,
  units,
  tenants,
}: ManagerTenantListProps) {
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Tenant list
        </h2>
        <p className="text-sm font-semibold leading-6 text-text-muted">
          This shows tenants your manager workspace has added directly.
        </p>
      </div>

      {tenants.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft">
          {tenants.map((tenant) => {
            const unit = unitById.get(tenant.unit_id);
            const signal = getTenantRentSignal(tenant);

            return (
              <article key={tenant.id} className="space-y-3 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-text-strong">
                        {tenant.full_name}
                      </p>

                      {signal ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${signal.className}`}
                        >
                          {signal.label}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {tenant.phone_number}
                    </p>

                    {tenant.email ? (
                      <p className="mt-1 truncate text-sm font-semibold text-text-muted">
                        {tenant.email}
                      </p>
                    ) : null}
                  </div>

                  <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {MANAGER_TENANT_STATUS_LABELS[tenant.status]}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Property
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {propertyNameById.get(tenant.property_id) ?? "Property"}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Unit
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {unit?.unit_label ?? "Unit"}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Rent amount
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(tenant.rent_amount)}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Next due date
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatDate(tenant.next_rent_due_date)}
                    </p>
                  </div>

                  <div className="rounded-card bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Current balance
                    </p>
                    <p className="mt-1 text-sm font-black text-text-strong">
                      {formatNaira(tenant.current_balance)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-card bg-surface p-4">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            No tenant has been added yet.
          </p>
        </div>
      )}
    </section>
  );
}
