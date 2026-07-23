"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { ManagerLandlordForm } from "@/components/manager/manager-landlord-form";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordClientRow,
  ManagerLandlordRemittanceRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerLandlordsWorkspaceProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
  maintenance: ManagerMaintenanceRequestRow[];
};

type LandlordPosition = {
  client: ManagerLandlordClientRow;
  propertyCount: number;
  occupiedUnits: number;
  pendingRemittance: number;
  owingAmount: number;
  needsAttention: boolean;
  propertyNames: string[];
};

const PAGE_SIZE = 10;

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "L";
}

function isReliablePayment(payment: ManagerRentPaymentRow) {
  return payment.status === "recorded" || payment.status === "verified";
}

function isReliableRemittance(remittance: ManagerLandlordRemittanceRow) {
  return remittance.status === "recorded" || remittance.status === "confirmed";
}

function SummaryCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            {value}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ManagerLandlordsWorkspace({
  landlordClients,
  properties,
  units,
  tenants,
  payments,
  remittances,
  maintenance,
}: ManagerLandlordsWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [attentionFilter, setAttentionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showAddLandlord, setShowAddLandlord] = useState(false);
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(
    landlordClients[0]?.id ?? null,
  );

  const positions = useMemo<LandlordPosition[]>(() => {
    return landlordClients.map((client) => {
      const landlordProperties = properties.filter(
        (property) => property.landlord_client_id === client.id,
      );
      const landlordPropertyIds = new Set(
        landlordProperties.map((property) => property.id),
      );
      const landlordUnits = units.filter((unit) =>
        landlordPropertyIds.has(unit.property_id),
      );
      const currentTenantUnitIds = new Set(
        tenants
          .filter(
            (tenant) =>
              tenant.landlord_client_id === client.id &&
              (tenant.status === "active" || tenant.status === "eviction_notice"),
          )
          .map((tenant) => tenant.unit_id),
      );
      const amountDue = payments
        .filter(
          (payment) =>
            payment.landlord_client_id === client.id && isReliablePayment(payment),
        )
        .reduce(
          (total, payment) => total + Number(payment.landlord_net_amount),
          0,
        );
      const amountRemitted = remittances
        .filter(
          (remittance) =>
            remittance.landlord_client_id === client.id &&
            isReliableRemittance(remittance),
        )
        .reduce(
          (total, remittance) => total + Number(remittance.amount_remitted),
          0,
        );
      const propertyExpenses = maintenance
        .filter((request) => request.landlord_client_id === client.id)
        .reduce(
          (total, request) =>
            total +
            Math.max(
              0,
              Number(request.actual_cost) || Number(request.estimated_cost) || 0,
            ),
          0,
        );
      const owingAmount = tenants
        .filter(
          (tenant) =>
            tenant.landlord_client_id === client.id &&
            (tenant.status === "active" || tenant.status === "eviction_notice"),
        )
        .reduce(
          (total, tenant) => total + Math.max(0, Number(tenant.current_balance)),
          0,
        );
      const pendingRemittance = Math.max(
        0,
        amountDue - propertyExpenses - amountRemitted,
      );

      return {
        client,
        propertyCount: landlordProperties.length,
        occupiedUnits: landlordUnits.filter((unit) =>
          currentTenantUnitIds.has(unit.id),
        ).length,
        pendingRemittance,
        owingAmount,
        needsAttention: pendingRemittance > 0 || owingAmount > 0,
        propertyNames: landlordProperties.map((property) => property.property_name),
      };
    });
  }, [
    landlordClients,
    maintenance,
    payments,
    properties,
    remittances,
    tenants,
    units,
  ]);

  const totals = useMemo(() => {
    return {
      landlords: positions.filter((item) => item.client.status === "active").length,
      properties: positions.reduce((total, item) => total + item.propertyCount, 0),
      pendingRemittance: positions.reduce(
        (total, item) => total + item.pendingRemittance,
        0,
      ),
      owingAmount: positions.reduce((total, item) => total + item.owingAmount, 0),
    };
  }, [positions]);

  const filteredPositions = useMemo(() => {
    const safeQuery = query.trim().toLowerCase();

    return positions.filter((item) => {
      if (statusFilter !== "all" && item.client.status !== statusFilter) {
        return false;
      }

      if (attentionFilter === "attention" && !item.needsAttention) {
        return false;
      }

      if (!safeQuery) {
        return true;
      }

      return [
        item.client.landlord_name,
        item.client.landlord_phone,
        item.client.landlord_email,
        ...item.propertyNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(safeQuery);
    });
  }, [attentionFilter, positions, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPositions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visiblePositions = filteredPositions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedPosition =
    positions.find((item) => item.client.id === selectedLandlordId) ?? null;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-strong">
            Landlord clients
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            A searchable list of landlords and the properties your company manages for them.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddLandlord((current) => !current)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          {showAddLandlord ? <X size={18} /> : <Plus size={18} />}
          {showAddLandlord ? "Close form" : "Add landlord"}
        </button>
      </header>

      {showAddLandlord ? (
        <section id="add-landlord" className="max-w-xl">
          <ManagerLandlordForm />
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total landlords"
          value={totals.landlords}
          description="Active landlord clients"
          icon={<UsersRound size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Properties managed"
          value={totals.properties}
          description="Across all landlords"
          icon={<Building2 size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Pending remittance"
          value={formatNaira(totals.pendingRemittance)}
          description="Total still due to landlords"
          icon={<WalletCards size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Owing tenants"
          value={formatNaira(totals.owingAmount)}
          description="Outstanding tenant balances"
          icon={<CircleDollarSign size={21} strokeWidth={2.5} />}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
          <div className="grid gap-3 border-b border-border-soft p-4 lg:grid-cols-[minmax(260px,1fr)_180px_200px]">
            <label className="flex min-h-11 items-center gap-3 rounded-button border border-border-soft bg-white px-4">
              <Search size={18} className="shrink-0 text-text-muted" />
              <input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setQuery(event.target.value);
                  resetPage();
                }}
                placeholder="Search by name, phone, email, or property"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-strong outline-none placeholder:text-text-muted"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setStatusFilter(event.target.value);
                resetPage();
              }}
              className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none focus:border-primary"
            >
              <option value="all">All landlords</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={attentionFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setAttentionFilter(event.target.value);
                resetPage();
              }}
              className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none focus:border-primary"
            >
              <option value="all">All positions</option>
              <option value="attention">Needs attention</option>
            </select>
          </div>

          {visiblePositions.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Landlord</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-center">Properties</th>
                      <th className="px-4 py-3 text-center">Occupied units</th>
                      <th className="px-4 py-3">Pending remittance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {visiblePositions.map((item) => {
                      const active = item.client.id === selectedLandlordId;

                      return (
                        <tr
                          key={item.client.id}
                          className={active ? "bg-primary-soft/40" : "bg-white"}
                        >
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedLandlordId(item.client.id)}
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-black text-primary">
                                {getInitials(item.client.landlord_name)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-text-strong">
                                  {item.client.landlord_name}
                                </span>
                                <span className="mt-1 block truncate text-xs font-semibold text-text-muted">
                                  {item.client.landlord_email ?? "No email added"}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                            {item.client.landlord_phone ?? "Not added"}
                          </td>
                          <td className="px-4 py-4 text-center text-sm font-black text-text-strong">
                            {item.propertyCount}
                          </td>
                          <td className="px-4 py-4 text-center text-sm font-black text-text-strong">
                            {item.occupiedUnits}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-text-strong">
                            {formatNaira(item.pendingRemittance)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                                item.client.status === "active"
                                  ? item.needsAttention
                                    ? "bg-warning-soft text-warning"
                                    : "bg-success-soft text-success"
                                  : "bg-surface text-text-muted"
                              }`}
                            >
                              {item.client.status === "active"
                                ? item.needsAttention
                                  ? "Needs attention"
                                  : "Active"
                                : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedLandlordId(item.client.id)}
                                className="inline-flex min-h-9 items-center justify-center rounded-button border border-border-soft px-3 text-xs font-extrabold text-text-strong transition hover:bg-surface"
                              >
                                View
                              </button>
                              <Link
                                href={`/manager/properties?q=${encodeURIComponent(
                                  item.client.landlord_name,
                                )}`}
                                prefetch={false}
                                className="inline-flex min-h-9 items-center justify-center rounded-button border border-primary/20 px-3 text-xs font-extrabold text-primary transition hover:bg-primary-soft"
                              >
                                Open properties
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border-soft lg:hidden">
                {visiblePositions.map((item) => (
                  <article key={item.client.id} className="space-y-3 p-4">
                    <button
                      type="button"
                      onClick={() => setSelectedLandlordId(item.client.id)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-black text-primary">
                        {getInitials(item.client.landlord_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black text-text-strong">
                          {item.client.landlord_name}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-text-muted">
                          {item.propertyCount} properties · {item.occupiedUnits} occupied units
                        </span>
                      </span>
                    </button>
                    <div className="grid grid-cols-2 gap-3 rounded-button bg-surface p-3 text-sm">
                      <div>
                        <p className="font-bold text-text-muted">Pending remittance</p>
                        <p className="mt-1 font-black text-text-strong">
                          {formatNaira(item.pendingRemittance)}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-text-muted">Tenant balance</p>
                        <p className="mt-1 font-black text-text-strong">
                          {formatNaira(item.owingAmount)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/manager/properties?q=${encodeURIComponent(
                        item.client.landlord_name,
                      )}`}
                      prefetch={false}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-border-soft text-sm font-extrabold text-text-strong"
                    >
                      Open properties
                    </Link>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="font-black text-text-strong">No landlords found</p>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Change the search or filter, or add a new landlord.
              </p>
            </div>
          )}

          <footer className="flex flex-col gap-3 border-t border-border-soft p-4 text-sm font-semibold text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {visiblePositions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
              {visiblePositions.length > 0
                ? ` to ${(safePage - 1) * PAGE_SIZE + visiblePositions.length}`
                : ""} of {filteredPositions.length} landlords
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="flex size-10 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="flex min-h-10 min-w-10 items-center justify-center rounded-button bg-primary px-3 font-black text-white">
                {safePage}
              </span>
              <span>of {pageCount}</span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                disabled={safePage >= pageCount}
                className="flex size-10 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </footer>
        </section>

        {selectedPosition ? (
          <aside className="h-fit rounded-card border border-border-soft bg-white p-5 shadow-sm xl:sticky xl:top-5">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-black text-primary">
                {getInitials(selectedPosition.client.landlord_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black text-text-strong">
                  {selectedPosition.client.landlord_name}
                </p>
                <span className="mt-1 inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-black text-success">
                  {selectedPosition.client.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-b border-border-soft pb-5 text-sm font-semibold text-text-muted">
              <p className="flex items-center gap-3">
                <Phone size={17} />
                {selectedPosition.client.landlord_phone ?? "Phone not added"}
              </p>
              <p className="flex items-center gap-3">
                <Mail size={17} />
                <span className="truncate">
                  {selectedPosition.client.landlord_email ?? "Email not added"}
                </span>
              </p>
            </div>

            <div className="mt-5">
              <h2 className="font-black text-text-strong">Current position</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 font-semibold text-text-muted">
                    <Building2 size={16} /> Properties
                  </dt>
                  <dd className="font-black text-text-strong">
                    {selectedPosition.propertyCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 font-semibold text-text-muted">
                    <UserRound size={16} /> Occupied units
                  </dt>
                  <dd className="font-black text-text-strong">
                    {selectedPosition.occupiedUnits}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Pending remittance</dt>
                  <dd className="font-black text-text-strong">
                    {formatNaira(selectedPosition.pendingRemittance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Tenant balances</dt>
                  <dd className="font-black text-text-strong">
                    {formatNaira(selectedPosition.owingAmount)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 border-t border-border-soft pt-5">
              <h2 className="font-black text-text-strong">Properties</h2>
              {selectedPosition.propertyNames.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm font-semibold text-text-muted">
                  {selectedPosition.propertyNames.slice(0, 4).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm font-semibold text-text-muted">
                  No property has been added for this landlord.
                </p>
              )}
            </div>

            <Link
              href={`/manager/properties?q=${encodeURIComponent(
                selectedPosition.client.landlord_name,
              )}`}
              prefetch={false}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary"
            >
              View landlord properties
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
