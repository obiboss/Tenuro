"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Plus,
  Search,
  Send,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { recordManagerPropertyRemittanceAction } from "@/actions/manager-operational-views.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordClientRow,
  ManagerLandlordRemittanceRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
} from "@/server/repositories/manager.repository";

type ManagerRemittancesWorkspaceProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
  maintenance: ManagerMaintenanceRequestRow[];
};

type RemittancePosition = {
  key: string;
  landlord: ManagerLandlordClientRow;
  property: ManagerPropertyRow;
  rentCollected: number;
  commission: number;
  expenses: number;
  amountDue: number;
  amountRemitted: number;
  pending: number;
  lastRemittanceDate: string | null;
  remittanceCount: number;
};

const PAGE_SIZE = 10;

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No remittance yet";
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

function todayDateOnly() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function getRemittancePropertyId(remittance: ManagerLandlordRemittanceRow) {
  const value = remittance.metadata?.property_id;
  return typeof value === "string" && value.length > 0 ? value : null;
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
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-text-muted">{label}</p>
          <p className="mt-1 text-xl font-black tracking-tight text-text-strong">
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

export function ManagerRemittancesWorkspace({
  landlordClients,
  properties,
  payments,
  remittances,
  maintenance,
}: ManagerRemittancesWorkspaceProps) {
  const [state, formAction, isPending] = useActionState(
    recordManagerPropertyRemittanceAction,
    initialManagerActionState,
  );
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [selectedLandlordId, setSelectedLandlordId] = useState(
    landlordClients[0]?.id ?? "",
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties.find(
      (property) => property.landlord_client_id === landlordClients[0]?.id,
    )?.id ?? "",
  );
  const [selectedPositionKey, setSelectedPositionKey] = useState<string | null>(
    properties[0]
      ? `${properties[0].landlord_client_id}:${properties[0].id}`
      : null,
  );
  const [page, setPage] = useState(1);

  const landlordById = useMemo(
    () => new Map(landlordClients.map((client) => [client.id, client])),
    [landlordClients],
  );

  const positions = useMemo<RemittancePosition[]>(() => {
    const result: RemittancePosition[] = [];

    for (const property of properties.filter(
      (candidate) => candidate.status !== "archived",
    )) {
      const landlord = landlordById.get(property.landlord_client_id);

      if (!landlord) {
        continue;
      }

      const propertyPayments = payments.filter(
        (payment) =>
          payment.property_id === property.id && isReliablePayment(payment),
      );
      const rentCollected = propertyPayments.reduce(
        (total, payment) => total + Number(payment.amount_paid),
        0,
      );
      const commission = propertyPayments.reduce(
        (total, payment) => total + Number(payment.management_fee_amount),
        0,
      );
      const propertyExpenses = maintenance
        .filter((request) => request.property_id === property.id)
        .reduce(
          (total, request) =>
            total +
            Math.max(
              0,
              Number(request.actual_cost) || Number(request.estimated_cost) || 0,
            ),
          0,
        );
      const grossLandlordShare = propertyPayments.reduce(
        (total, payment) => total + Number(payment.landlord_net_amount),
        0,
      );
      const amountDue = Math.max(0, grossLandlordShare - propertyExpenses);
      const propertyRemittances = remittances.filter(
        (remittance) =>
          remittance.landlord_client_id === property.landlord_client_id &&
          getRemittancePropertyId(remittance) === property.id &&
          isReliableRemittance(remittance),
      );
      const amountRemitted = propertyRemittances.reduce(
        (total, remittance) => total + Number(remittance.amount_remitted),
        0,
      );
      const lastRemittanceDate: string | null =
        [...propertyRemittances].sort((first, second) =>
          second.remittance_date.localeCompare(first.remittance_date),
        )[0]?.remittance_date ?? null;

      result.push({
        key: `${property.landlord_client_id}:${property.id}`,
        landlord,
        property,
        rentCollected,
        commission,
        expenses: propertyExpenses,
        amountDue,
        amountRemitted,
        pending: Math.max(0, amountDue - amountRemitted),
        lastRemittanceDate,
        remittanceCount: propertyRemittances.length,
      });
    }

    return result.sort((first, second) => second.pending - first.pending);
  }, [landlordById, maintenance, payments, properties, remittances]);

  const unallocatedRemittances = useMemo(
    () =>
      remittances.filter(
        (remittance) =>
          isReliableRemittance(remittance) && !getRemittancePropertyId(remittance),
      ),
    [remittances],
  );
  const unallocatedTotal = unallocatedRemittances.reduce(
    (total, remittance) => total + Number(remittance.amount_remitted),
    0,
  );

  const totals = useMemo(() => {
    return {
      due: positions.reduce((total, position) => total + position.amountDue, 0),
      remitted: positions.reduce(
        (total, position) => total + position.amountRemitted,
        0,
      ),
      pending: positions.reduce((total, position) => total + position.pending, 0),
      landlordsWaiting: new Set(
        positions
          .filter((position) => position.pending > 0)
          .map((position) => position.landlord.id),
      ).size,
    };
  }, [positions]);

  const filteredPositions = useMemo(() => {
    const safeQuery = query.trim().toLowerCase();

    return positions.filter((position) => {
      if (statusFilter === "pending" && position.pending <= 0) {
        return false;
      }

      if (statusFilter === "remitted" && position.pending > 0) {
        return false;
      }

      if (
        propertyFilter !== "all" &&
        position.property.id !== propertyFilter
      ) {
        return false;
      }

      if (!safeQuery) {
        return true;
      }

      return [
        position.landlord.landlord_name,
        position.landlord.landlord_phone,
        position.property.property_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(safeQuery);
    });
  }, [positions, propertyFilter, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPositions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visiblePositions = filteredPositions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedPosition =
    positions.find((position) => position.key === selectedPositionKey) ?? null;
  const formProperties = properties.filter(
    (property) => property.landlord_client_id === selectedLandlordId,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-strong">
            Remittances
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            See what each property owes its landlord, what has been paid, and what remains.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft"
        >
          {showForm ? <X size={17} /> : <Plus size={17} />}
          {showForm ? "Close form" : "Record remittance"}
        </button>
      </header>

      {showForm ? (
        <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-text-strong">
              Record property remittance
            </h2>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Select the landlord and property so future reports can allocate the remittance accurately.
            </p>
          </div>

          {state.message ? (
            <div
              className={`mt-4 rounded-button px-4 py-3 text-sm font-semibold ${
                state.ok
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
              }`}
              role="alert"
            >
              {state.message}
            </div>
          ) : null}

          <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Landlord</span>
              <select
                name="landlordClientId"
                value={selectedLandlordId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const landlordId = event.target.value;
                  const firstProperty = properties.find(
                    (property) => property.landlord_client_id === landlordId,
                  );
                  setSelectedLandlordId(landlordId);
                  setSelectedPropertyId(firstProperty?.id ?? "");
                }}
                required
                className="min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="">Select landlord</option>
                {landlordClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.landlord_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Property</span>
              <select
                name="propertyId"
                value={selectedPropertyId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedPropertyId(event.target.value)}
                required
                className="min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="">Select property</option>
                {formProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.property_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Amount remitted</span>
              <input
                name="amountRemitted"
                type="number"
                min="0.01"
                step="0.01"
                required
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Remittance date</span>
              <input
                name="remittanceDate"
                type="date"
                defaultValue={todayDateOnly()}
                required
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Period start</span>
              <input
                name="periodStart"
                type="date"
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Period end</span>
              <input
                name="periodEnd"
                type="date"
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Payment method</span>
              <select
                name="paymentMethod"
                defaultValue="bank_transfer"
                className="min-h-11 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-text-strong">Payment reference</span>
              <input
                name="paymentReference"
                placeholder="Transfer reference or narration"
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-bold text-text-strong">Proof URL</span>
              <input
                name="proofUrl"
                type="url"
                placeholder="Optional link to payment proof"
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-bold text-text-strong">Notes</span>
              <input
                name="notes"
                placeholder="Optional note"
                className="min-h-11 w-full rounded-button border border-border-soft px-4 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={isPending || !selectedPropertyId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft disabled:opacity-50 lg:col-span-4 lg:justify-self-end"
            >
              <Send size={17} />
              {isPending ? "Saving remittance..." : "Record remittance"}
            </button>
          </form>
        </section>
      ) : null}

      {unallocatedTotal > 0 ? (
        <section className="rounded-card border border-warning/20 bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-muted">
          <strong className="text-text-strong">
            {formatNaira(unallocatedTotal)} in older remittances is not assigned to a property.
          </strong>{" "}
          It remains in the landlord-level history and is not distributed across properties automatically.
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total due to landlords"
          value={formatNaira(totals.due)}
          description="After commission and property expenses"
          icon={<CircleDollarSign size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Total remitted"
          value={formatNaira(totals.remitted)}
          description="Assigned to properties"
          icon={<Banknote size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Pending remittances"
          value={formatNaira(totals.pending)}
          description="Still payable to landlords"
          icon={<Clock3 size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Landlords awaiting remittance"
          value={String(totals.landlordsWaiting)}
          description="With at least one property balance"
          icon={<UsersRound size={21} strokeWidth={2.5} />}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
          <div className="grid gap-3 border-b border-border-soft p-4 lg:grid-cols-[minmax(260px,1fr)_180px_220px]">
            <label className="flex min-h-11 items-center gap-2 rounded-button border border-border-soft px-4">
              <Search size={17} className="text-text-muted" />
              <input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search landlord, property, or phone"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-text-muted"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-bold outline-none"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="remitted">Fully remitted</option>
            </select>
            <select
              value={propertyFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setPropertyFilter(event.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-bold outline-none"
            >
              <option value="all">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name}
                </option>
              ))}
            </select>
          </div>

          {visiblePositions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-left">
                <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Landlord</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Rent collected</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Expenses</th>
                    <th className="px-4 py-3">Amount due</th>
                    <th className="px-4 py-3">Amount remitted</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Last remittance</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {visiblePositions.map((position) => (
                    <tr
                      key={position.key}
                      className={
                        position.key === selectedPositionKey
                          ? "bg-primary-soft/40"
                          : "bg-white"
                      }
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPositionKey(position.key)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-black text-primary">
                            {getInitials(position.landlord.landlord_name)}
                          </span>
                          <span>
                            <span className="block text-sm font-black text-text-strong">
                              {position.landlord.landlord_name}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-text-muted">
                              {position.landlord.landlord_phone ?? "Phone not added"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-text-strong">
                        {position.property.property_name}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatNaira(position.rentCollected)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                        -{formatNaira(position.commission)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                        -{formatNaira(position.expenses)}
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-text-strong">
                        {formatNaira(position.amountDue)}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-text-strong">
                        {formatNaira(position.amountRemitted)}
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-warning">
                        {formatNaira(position.pending)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                        {formatDate(position.lastRemittanceDate)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPositionKey(position.key)}
                          className="inline-flex min-h-9 items-center justify-center rounded-button border border-primary/20 px-3 text-xs font-extrabold text-primary hover:bg-primary-soft"
                        >
                          View breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm font-semibold text-text-muted">
              No remittance position matches this view.
            </div>
          )}

          <footer className="flex flex-col gap-3 border-t border-border-soft p-4 text-sm font-semibold text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {visiblePositions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
              {visiblePositions.length > 0
                ? ` to ${(safePage - 1) * PAGE_SIZE + visiblePositions.length}`
                : ""} of {filteredPositions.length} positions
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="flex size-10 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="flex size-10 items-center justify-center rounded-button bg-primary font-black text-white">
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
                {getInitials(selectedPosition.landlord.landlord_name)}
              </span>
              <div>
                <p className="text-lg font-black text-text-strong">
                  {selectedPosition.landlord.landlord_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {selectedPosition.landlord.landlord_phone ?? "Phone not added"}
                </p>
              </div>
            </div>

            <div className="mt-5 border-y border-border-soft py-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Property
              </p>
              <p className="mt-1 flex items-center gap-2 font-black text-text-strong">
                <Building2 size={17} />
                {selectedPosition.property.property_name}
              </p>
            </div>

            <div className="mt-5">
              <h2 className="font-black text-text-strong">Remittance summary</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Rent collected</dt>
                  <dd className="font-black text-text-strong">
                    {formatNaira(selectedPosition.rentCollected)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Manager commission</dt>
                  <dd className="font-bold text-text-strong">
                    -{formatNaira(selectedPosition.commission)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Property expenses</dt>
                  <dd className="font-bold text-text-strong">
                    -{formatNaira(selectedPosition.expenses)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border-soft pt-3">
                  <dt className="font-black text-text-strong">Amount due</dt>
                  <dd className="font-black text-text-strong">
                    {formatNaira(selectedPosition.amountDue)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-text-muted">Amount remitted</dt>
                  <dd className="font-black text-success">
                    {formatNaira(selectedPosition.amountRemitted)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 rounded-button border border-warning/30 bg-warning-soft p-3">
                  <dt className="font-black text-warning">Balance outstanding</dt>
                  <dd className="font-black text-warning">
                    {formatNaira(selectedPosition.pending)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 space-y-3 border-t border-border-soft pt-5 text-sm">
              <p className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-semibold text-text-muted">
                  <CalendarDays size={16} /> Last remittance
                </span>
                <strong className="text-text-strong">
                  {formatDate(selectedPosition.lastRemittanceDate)}
                </strong>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="font-semibold text-text-muted">Remittance records</span>
                <strong className="text-text-strong">
                  {selectedPosition.remittanceCount}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedLandlordId(selectedPosition.landlord.id);
                setSelectedPropertyId(selectedPosition.property.id);
                setShowForm(true);
                window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
              }}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white"
            >
              <WalletCards size={17} />
              Record remittance
            </button>
            <Link
              href={`/manager/reports?landlordClientId=${encodeURIComponent(
                selectedPosition.landlord.id,
              )}&propertyId=${encodeURIComponent(selectedPosition.property.id)}`}
              prefetch={false}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button border border-border-soft px-4 text-sm font-extrabold text-text-strong"
            >
              <UserRound size={17} />
              View full property report
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
