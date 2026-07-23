"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileText,
  Home,
  Send,
  WalletCards,
  Wrench,
} from "lucide-react";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
} from "@/server/repositories/manager.repository";
import type { ManagerUnifiedPropertyReportSnapshot } from "@/lib/manager-unified-report";

type ManagerReportsWorkspaceProps = {
  landlordOptions: ManagerLandlordClientRow[];
  propertyOptions: ManagerPropertyRow[];
  snapshot: ManagerUnifiedPropertyReportSnapshot | null;
};

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function getStatusClass(status: string) {
  if (status === "paid_up") {
    return "bg-success-soft text-success";
  }

  if (status === "due_soon") {
    return "bg-warning-soft text-warning";
  }

  return "bg-danger-soft text-danger";
}

function SummaryCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p className="mt-1 text-lg font-black text-text-strong">{value}</p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ManagerReportsWorkspace({
  landlordOptions,
  propertyOptions,
  snapshot,
}: ManagerReportsWorkspaceProps) {
  const [landlordId, setLandlordId] = useState(
    snapshot?.landlord.id ?? landlordOptions[0]?.id ?? "",
  );
  const landlordProperties = useMemo(
    () =>
      propertyOptions.filter(
        (property) => property.landlord_client_id === landlordId,
      ),
    [landlordId, propertyOptions],
  );
  const [propertyId, setPropertyId] = useState(
    snapshot?.property.id ?? landlordProperties[0]?.id ?? "",
  );
  const downloadQuery = snapshot
    ? new URLSearchParams({
        landlordClientId: snapshot.landlord.id,
        propertyId: snapshot.property.id,
        dateFrom: snapshot.period.dateFrom,
        dateTo: snapshot.period.dateTo,
      }).toString()
    : "";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-text-strong">
          Reports
        </h1>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Select a landlord, property, and period. BOPA brings the complete property record together automatically.
        </p>
      </header>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <form
          method="get"
          action="/manager/reports"
          className="grid gap-4 lg:grid-cols-[1fr_1fr_190px_190px_auto] lg:items-end"
        >
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-strong">Landlord</span>
            <select
              name="landlordClientId"
              value={landlordId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const nextLandlordId = event.target.value;
                const firstProperty = propertyOptions.find(
                  (property) => property.landlord_client_id === nextLandlordId,
                );
                setLandlordId(nextLandlordId);
                setPropertyId(firstProperty?.id ?? "");
              }}
              required
              className="min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            >
              <option value="">Select landlord</option>
              {landlordOptions.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.landlord_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-strong">Property</span>
            <select
              name="propertyId"
              value={propertyId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setPropertyId(event.target.value)}
              required
              className="min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            >
              <option value="">Select property</option>
              {landlordProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-strong">From</span>
            <input
              name="dateFrom"
              type="date"
              defaultValue={snapshot?.period.dateFrom}
              required
              className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-strong">To</span>
            <input
              name="dateTo"
              type="date"
              defaultValue={snapshot?.period.dateTo}
              required
              className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={!landlordId || !propertyId}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft disabled:opacity-50"
          >
            <FileText size={17} />
            Generate report
          </button>
        </form>

        <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-text-muted">
          <CircleDollarSign size={17} className="mt-1 shrink-0" />
          Rent payments, manager commission, property expenses, remittances, occupancy, and tenant rent position are included automatically.
        </p>
      </section>

      {!snapshot ? (
        <section className="rounded-card border border-border-soft bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto text-primary" size={28} />
          <h2 className="mt-3 text-lg font-black text-text-strong">
            Add a landlord and property to generate a report
          </h2>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            The report will appear here once a property is available.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
          <header className="flex flex-col gap-4 border-b border-border-soft p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Report for
                </p>
                <p className="mt-1 truncate font-black text-text-strong">
                  {snapshot.landlord.landlord_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Property
                </p>
                <p className="mt-1 truncate font-black text-text-strong">
                  {snapshot.property.property_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Period
                </p>
                <p className="mt-1 flex items-center gap-2 font-black text-text-strong">
                  <CalendarDays size={16} />
                  {formatDate(snapshot.period.dateFrom)} – {formatDate(snapshot.period.dateTo)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`/manager/reports/unified/download?${downloadQuery}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-border-soft px-4 text-sm font-extrabold text-text-strong hover:bg-surface"
              >
                <Download size={17} />
                Download PDF
              </a>
              <a
                href={`/manager/reports/unified/share?${downloadQuery}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft"
              >
                <Send size={17} />
                Send WhatsApp summary
              </a>
            </div>
          </header>

          <div className="space-y-5 p-5">
            {snapshot.totals.unallocatedLandlordRemittances > 0 ? (
              <div className="rounded-button border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-text-muted">
                <strong className="text-text-strong">
                  {formatNaira(snapshot.totals.unallocatedLandlordRemittances)} in older remittances is not assigned to a property.
                </strong>{" "}
                BOPA has not added it to this property’s remitted total to avoid an inaccurate allocation.
              </div>
            ) : null}

            <div>
              <h2 className="font-black text-text-strong">Financial summary</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  label="Rent collected"
                  value={formatNaira(snapshot.totals.rentCollected)}
                  description="Recorded and verified"
                  icon={<Banknote size={19} />}
                />
                <SummaryCard
                  label="Manager commission"
                  value={formatNaira(snapshot.totals.managerCommission)}
                  description="Company revenue"
                  icon={<WalletCards size={19} />}
                />
                <SummaryCard
                  label="Maintenance & expenses"
                  value={formatNaira(snapshot.totals.maintenanceAndExpenses)}
                  description="Property costs"
                  icon={<Wrench size={19} />}
                />
                <SummaryCard
                  label="Amount remitted"
                  value={formatNaira(snapshot.totals.amountRemitted)}
                  description="Assigned to this property"
                  icon={<Home size={19} />}
                />
                <SummaryCard
                  label="Pending balance"
                  value={formatNaira(snapshot.totals.pendingLandlordBalance)}
                  description="Still due to landlord"
                  icon={<CircleDollarSign size={19} />}
                />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
              <section className="rounded-card border border-border-soft p-4">
                <h2 className="font-black text-text-strong">
                  Expenses and maintenance
                </h2>
                {snapshot.expenses.length > 0 ? (
                  <div className="mt-3 divide-y divide-border-soft">
                    {snapshot.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-black text-text-strong">
                            {expense.title}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-text-muted">
                            {formatDate(expense.date)} · {expense.vendorName ?? "Vendor not added"} · {expense.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-text-strong">
                          {formatNaira(expense.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-button bg-surface p-4 text-sm font-semibold text-text-muted">
                    No expense was recorded for this property in the selected period.
                  </p>
                )}
              </section>

              <section className="rounded-card border border-border-soft p-4">
                <h2 className="font-black text-text-strong">
                  Occupancy and tenant position
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-button bg-surface p-3">
                    <dt className="font-semibold text-text-muted">Total units</dt>
                    <dd className="mt-1 text-lg font-black text-text-strong">
                      {snapshot.occupancy.totalUnits}
                    </dd>
                  </div>
                  <div className="rounded-button bg-surface p-3">
                    <dt className="font-semibold text-text-muted">Occupied units</dt>
                    <dd className="mt-1 text-lg font-black text-text-strong">
                      {snapshot.occupancy.occupiedUnits}
                    </dd>
                  </div>
                  <div className="rounded-button bg-surface p-3">
                    <dt className="font-semibold text-text-muted">Occupancy rate</dt>
                    <dd className="mt-1 text-lg font-black text-success">
                      {snapshot.occupancy.occupancyRate}%
                    </dd>
                  </div>
                  <div className="rounded-button bg-surface p-3">
                    <dt className="font-semibold text-text-muted">Tenants owing</dt>
                    <dd className="mt-1 text-lg font-black text-danger">
                      {snapshot.occupancy.tenantsOwing}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="overflow-hidden rounded-card border border-border-soft">
              <div className="border-b border-border-soft p-4">
                <h2 className="font-black text-text-strong">
                  Rent position by unit
                </h2>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  Who is paid up, due soon, or owing in this property.
                </p>
              </div>
              {snapshot.rentPositions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Tenant</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Next due</th>
                        <th className="px-4 py-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {snapshot.rentPositions.map((position) => (
                        <tr key={position.tenantId}>
                          <td className="px-4 py-4 text-sm font-black text-text-strong">
                            {position.unitLabel}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-text-strong">
                            {position.tenantName}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                                position.status,
                              )}`}
                            >
                              {position.statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                            {formatDate(position.nextDueDate)}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-text-strong">
                            {formatNaira(position.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-5 text-sm font-semibold text-text-muted">
                  No current tenant is linked to this property.
                </p>
              )}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="overflow-hidden rounded-card border border-border-soft">
                <div className="border-b border-border-soft p-4">
                  <h2 className="font-black text-text-strong">Rent payments</h2>
                </div>
                {snapshot.payments.length > 0 ? (
                  <div className="divide-y divide-border-soft">
                    {snapshot.payments.slice(0, 8).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-start justify-between gap-4 p-4"
                      >
                        <div>
                          <p className="text-sm font-black text-text-strong">
                            {payment.tenantName} · {payment.unitLabel}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-text-muted">
                            {formatDate(payment.paymentDate)} · {payment.source}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-text-strong">
                          {formatNaira(payment.amountPaid)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-5 text-sm font-semibold text-text-muted">
                    No rent payment was recorded in this period.
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-card border border-border-soft">
                <div className="border-b border-border-soft p-4">
                  <h2 className="font-black text-text-strong">Remittances</h2>
                </div>
                {snapshot.remittances.length > 0 ? (
                  <div className="divide-y divide-border-soft">
                    {snapshot.remittances.slice(0, 8).map((remittance) => (
                      <div
                        key={remittance.id}
                        className="flex items-start justify-between gap-4 p-4"
                      >
                        <div>
                          <p className="text-sm font-black text-text-strong">
                            {remittance.paymentMethod.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-text-muted">
                            {formatDate(remittance.remittanceDate)} · {remittance.paymentReference ?? "No reference"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-success">
                          {formatNaira(remittance.amountRemitted)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-5 text-sm font-semibold text-text-muted">
                    No property-specific remittance was recorded in this period.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
