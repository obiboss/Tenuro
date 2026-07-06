import Link from "next/link";
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
  searchQuery: string;
  statusFilter: string;
  rentFilter: string;
};

type TenantRentSignal = {
  label: string;
  value: "clear" | "owing" | "due_soon" | "overdue" | "not_set";
  className: string;
};

const statusFilterOptions = [
  {
    value: "all",
    label: "All statuses",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "moved_out",
    label: "Moved out",
  },
  {
    value: "eviction_notice",
    label: "Eviction notice",
  },
] as const;

const rentFilterOptions = [
  {
    value: "all",
    label: "All rent status",
  },
  {
    value: "owing",
    label: "Owing",
  },
  {
    value: "overdue",
    label: "Overdue",
  },
  {
    value: "due_soon",
    label: "Due soon",
  },
  {
    value: "clear",
    label: "Clear",
  },
] as const;

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
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

function getDaysFromToday(date: string | null) {
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${date}T00:00:00`);
  const difference = dueDate.getTime() - today.getTime();

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getTenantRentSignal(tenant: ManagerTenantRow): TenantRentSignal {
  const balance = Number(tenant.current_balance);

  if (balance > 0) {
    return {
      label: "Owing",
      value: "owing",
      className: "bg-danger-soft text-danger",
    };
  }

  const daysUntilDue = getDaysFromToday(tenant.next_rent_due_date);

  if (daysUntilDue === null) {
    return {
      label: "No due date",
      value: "not_set",
      className: "bg-surface text-text-muted",
    };
  }

  if (daysUntilDue < 0) {
    return {
      label: `Overdue by ${Math.abs(daysUntilDue)} day${
        Math.abs(daysUntilDue) === 1 ? "" : "s"
      }`,
      value: "overdue",
      className: "bg-danger-soft text-danger",
    };
  }

  if (daysUntilDue <= 30) {
    return {
      label:
        daysUntilDue === 0
          ? "Due today"
          : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      value: "due_soon",
      className: "bg-warning-soft text-warning",
    };
  }

  return {
    label: "Clear",
    value: "clear",
    className: "bg-success-soft text-success",
  };
}

function normaliseFilter(value: string, allowedValues: readonly string[]) {
  return allowedValues.includes(value) ? value : "all";
}

export function ManagerTenantList({
  properties,
  units,
  tenants,
  searchQuery,
  statusFilter,
  rentFilter,
}: ManagerTenantListProps) {
  const safeSearchQuery = searchQuery.trim();
  const safeStatusFilter = normaliseFilter(
    statusFilter,
    statusFilterOptions.map((option) => option.value),
  );
  const safeRentFilter = normaliseFilter(
    rentFilter,
    rentFilterOptions.map((option) => option.value),
  );

  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );

  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const lowerSearchQuery = safeSearchQuery.toLowerCase();

  const filteredTenants = tenants
    .filter((tenant) => {
      if (safeStatusFilter !== "all" && tenant.status !== safeStatusFilter) {
        return false;
      }

      const signal = getTenantRentSignal(tenant);

      if (safeRentFilter !== "all" && signal.value !== safeRentFilter) {
        return false;
      }

      if (!lowerSearchQuery) {
        return true;
      }

      const unit = unitById.get(tenant.unit_id);
      const propertyName = propertyNameById.get(tenant.property_id) ?? "";

      return [
        tenant.full_name,
        tenant.phone_number,
        tenant.email ?? "",
        propertyName,
        unit?.unit_label ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(lowerSearchQuery);
    })
    .sort((first, second) => first.full_name.localeCompare(second.full_name));

  if (tenants.length === 0) {
    return (
      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          No tenant yet
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Open a property, add a unit, then add the tenant from a vacant unit.
        </p>

        <Link
          href="/manager/properties"
          prefetch={false}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Go to properties
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Tenant list
          </h2>
          <p className="text-sm font-semibold leading-6 text-text-muted">
            Search tenants, check balances, and open the property they belong
            to.
          </p>
        </div>

        <form
          action="/manager/tenants"
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_190px_auto]"
        >
          <input
            type="search"
            name="q"
            defaultValue={safeSearchQuery}
            placeholder="Search tenant, phone, property, or unit"
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
          />

          <select
            name="status"
            defaultValue={safeStatusFilter}
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="rent"
            defaultValue={safeRentFilter}
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
          >
            {rentFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="min-h-11 rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
          >
            Search
          </button>
        </form>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="p-5">
          <div className="rounded-card bg-surface p-4">
            <h3 className="font-black text-text-strong">No match found</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Try another tenant name, phone number, property, unit, or filter.
            </p>

            <Link
              href="/manager/tenants"
              prefetch={false}
              className="mt-3 inline-flex text-sm font-black text-primary"
            >
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border-soft text-left">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Property
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Rent
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Next due
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Rent status
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-text-muted">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-soft bg-white">
                {filteredTenants.map((tenant) => {
                  const unit = unitById.get(tenant.unit_id);
                  const signal = getTenantRentSignal(tenant);

                  return (
                    <tr
                      key={tenant.id}
                      id={`tenant-${tenant.id}`}
                      className="scroll-mt-24 align-top"
                    >
                      <td className="max-w-72 px-4 py-4">
                        <p className="truncate text-sm font-black text-text-strong">
                          {tenant.full_name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          {tenant.phone_number}
                        </p>
                        {tenant.email ? (
                          <p className="mt-1 truncate text-xs font-semibold text-text-muted">
                            {tenant.email}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {propertyNameById.get(tenant.property_id) ?? "Property"}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {unit?.unit_label ?? "Unit"}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatNaira(tenant.rent_amount)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatDate(tenant.next_rent_due_date)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatNaira(tenant.current_balance)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${signal.className}`}
                        >
                          {signal.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                          {MANAGER_TENANT_STATUS_LABELS[tenant.status]}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/manager/properties/${tenant.property_id}`}
                          prefetch={false}
                          className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                        >
                          Open property
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border-soft md:hidden">
            {filteredTenants.map((tenant) => {
              const unit = unitById.get(tenant.unit_id);
              const signal = getTenantRentSignal(tenant);

              return (
                <article
                  key={tenant.id}
                  id={`tenant-${tenant.id}`}
                  className="scroll-mt-24 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-text-strong">
                        {tenant.full_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        {unit?.unit_label ?? "Unit"} ·{" "}
                        {propertyNameById.get(tenant.property_id) ?? "Property"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {formatNaira(tenant.rent_amount)} · Due{" "}
                        {formatDate(tenant.next_rent_due_date)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${signal.className}`}
                    >
                      {signal.label}
                    </span>
                  </div>

                  <Link
                    href={`/manager/properties/${tenant.property_id}`}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Open property
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
