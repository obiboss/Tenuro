import Link from "next/link";
import {
  getManagerTenantRentStatus,
  type ManagerTenantRentStatus,
} from "@/lib/manager-rent-status";
import type {
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";
import type { ManagerTenantAgreementDocumentRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type ManagerTenantListProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
  agreementDocuments: ManagerTenantAgreementDocumentRow[];
  searchQuery: string;
  rentFilter: string;
};

const rentFilterOptions = [
  {
    value: "all",
    label: "All rent positions",
  },
  {
    value: "owing",
    label: "Owing",
  },
  {
    value: "due_soon",
    label: "Due soon",
  },
  {
    value: "clear",
    label: "Paid up",
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

function normaliseFilter(value: string, allowedValues: readonly string[]) {
  return allowedValues.includes(value) ? value : "all";
}

function getTenantRentStatusClassName(rentStatus: ManagerTenantRentStatus) {
  if (rentStatus.kind === "owing") {
    return "bg-danger-soft text-danger";
  }

  if (rentStatus.kind === "due_soon") {
    return "bg-warning-soft text-warning";
  }

  if (rentStatus.kind === "clear") {
    return "bg-success-soft text-success";
  }

  return "bg-surface text-text-muted";
}

function getTenantRentFilterValue(rentStatus: ManagerTenantRentStatus) {
  return rentStatus.kind;
}

function isNoticeServedTenant(tenant: ManagerTenantRow) {
  return tenant.status === "eviction_notice";
}

export function ManagerTenantList({
  properties,
  units,
  tenants,
  payments,
  agreementDocuments,
  searchQuery,
  rentFilter,
}: ManagerTenantListProps) {
  const safeSearchQuery = searchQuery.trim();
  const safeRentFilter = normaliseFilter(
    rentFilter,
    rentFilterOptions.map((option) => option.value),
  );

  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.property_name]),
  );

  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const lowerSearchQuery = safeSearchQuery.toLowerCase();
  const agreementsByTenantId = new Map<
    string,
    ManagerTenantAgreementDocumentRow[]
  >();
  const paymentsByTenantId = new Map<string, ManagerRentPaymentRow[]>();

  for (const agreement of agreementDocuments) {
    if (agreement.document_status !== "accepted") {
      continue;
    }

    agreementsByTenantId.set(agreement.tenant_id, [
      ...(agreementsByTenantId.get(agreement.tenant_id) ?? []),
      agreement,
    ]);
  }

  for (const payment of payments) {
    if (payment.status !== "verified" && payment.status !== "recorded") {
      continue;
    }

    paymentsByTenantId.set(payment.tenant_id, [
      ...(paymentsByTenantId.get(payment.tenant_id) ?? []),
      payment,
    ]);
  }

  const filteredTenants = tenants
    .filter((tenant) => {
      const unit = unitById.get(tenant.unit_id);
      const rentStatus = getManagerTenantRentStatus({
        tenant,
        unit,
      });

      if (
        safeRentFilter !== "all" &&
        getTenantRentFilterValue(rentStatus) !== safeRentFilter
      ) {
        return false;
      }

      if (!lowerSearchQuery) {
        return true;
      }

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
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_auto]"
        >
          <input
            type="search"
            name="q"
            defaultValue={safeSearchQuery}
            placeholder="Search tenant, phone, property, or unit"
            className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
          />

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
              Reset filters
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
                    Rent position
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-text-muted">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-soft bg-white">
                {filteredTenants.map((tenant) => {
                  const unit = unitById.get(tenant.unit_id);
                  const rentStatus = getManagerTenantRentStatus({
                    tenant,
                    unit,
                  });
                  const tenantAgreements =
                    agreementsByTenantId.get(tenant.id) ?? [];
                  const tenantPayments = paymentsByTenantId.get(tenant.id) ?? [];

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
                        {isNoticeServedTenant(tenant) ? (
                          <span className="mt-2 inline-flex rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning">
                            Notice served
                          </span>
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
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getTenantRentStatusClassName(
                            rentStatus,
                          )}`}
                        >
                          {rentStatus.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Link
                            href={`/manager/properties/${tenant.property_id}`}
                            prefetch={false}
                            className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                          >
                            Open property
                          </Link>

                          {tenantAgreements.slice(0, 1).map((agreement) => (
                            <Link
                              key={agreement.id}
                              href={`/manager/agreements/${agreement.id}/download`}
                              prefetch={false}
                              className="text-xs font-black text-primary underline-offset-4 hover:underline"
                            >
                              Download agreement
                            </Link>
                          ))}

                          {tenantPayments.slice(0, 2).map((payment) => (
                            <Link
                              key={payment.id}
                              href={`/manager/receipts/${payment.id}/download`}
                              prefetch={false}
                              className="text-xs font-black text-primary underline-offset-4 hover:underline"
                            >
                              Receipt {formatDate(payment.payment_date)}
                            </Link>
                          ))}
                        </div>
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
              const rentStatus = getManagerTenantRentStatus({
                tenant,
                unit,
              });
              const tenantAgreements =
                agreementsByTenantId.get(tenant.id) ?? [];
              const tenantPayments = paymentsByTenantId.get(tenant.id) ?? [];

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
                        {tenant.phone_number}
                      </p>
                      {isNoticeServedTenant(tenant) ? (
                        <span className="mt-2 inline-flex rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning">
                          Notice served
                        </span>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                        {unit?.unit_label ?? "Unit"} -{" "}
                        {propertyNameById.get(tenant.property_id) ?? "Property"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {formatNaira(tenant.rent_amount)} - Due{" "}
                        {formatDate(tenant.next_rent_due_date)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getTenantRentStatusClassName(
                        rentStatus,
                      )}`}
                    >
                      {rentStatus.label}
                    </span>
                  </div>

                  <Link
                    href={`/manager/properties/${tenant.property_id}`}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Open property
                  </Link>

                  {tenantAgreements.length > 0 || tenantPayments.length > 0 ? (
                    <div className="mt-3 rounded-card bg-surface p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                        Documents
                      </p>
                      <div className="mt-2 flex flex-col gap-2">
                        {tenantAgreements.slice(0, 1).map((agreement) => (
                          <Link
                            key={agreement.id}
                            href={`/manager/agreements/${agreement.id}/download`}
                            prefetch={false}
                            className="text-sm font-black text-primary"
                          >
                            Download agreement
                          </Link>
                        ))}

                        {tenantPayments.slice(0, 2).map((payment) => (
                          <Link
                            key={payment.id}
                            href={`/manager/receipts/${payment.id}/download`}
                            prefetch={false}
                            className="text-sm font-black text-primary"
                          >
                            Receipt {formatDate(payment.payment_date)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
