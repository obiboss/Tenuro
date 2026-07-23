"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Link2,
  Plus,
  ReceiptText,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { ManagerPaymentForm } from "@/components/manager/manager-payment-form";
import { ManagerPaystackPaymentLinkForm } from "@/components/manager/manager-paystack-payment-link-form";
import { ManagerPaystackPaymentLinkList } from "@/components/manager/manager-paystack-payment-link-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import {
  applyOfflineTenantOccupancy,
  mergeManagerRows,
} from "@/lib/offline/manager-data";
import type { ManagerRentPaymentRequestRow } from "@/server/repositories/manager-paystack.repository";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPaymentsOfflineViewProps = {
  initialLandlordClients: ManagerLandlordClientRow[];
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  initialPayments: ManagerRentPaymentRow[];
  paystackPaymentRequests: ManagerRentPaymentRequestRow[];
};

type PaymentFilter = "all" | "paid" | "due_soon" | "owing" | "via_app" | "manual";
type PaymentPanel = "manual" | "link" | null;

type TenantRentPosition = {
  tenant: ManagerTenantRow;
  unit: ManagerUnitRow | undefined;
  property: ManagerPropertyRow | undefined;
  kind: "owing" | "due_soon";
  label: string;
  amountDue: number;
  daysUntilDue: number | null;
};

const reliablePaymentStatuses = new Set(["recorded", "verified"]);
const TABLE_PAGE_SIZE = 10;

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTodayDateOnly() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysFromToday(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date(`${getTodayDateOnly()}T00:00:00Z`);
  const target = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getPaymentSource(payment: ManagerRentPaymentRow) {
  const source =
    typeof payment.metadata?.source === "string"
      ? payment.metadata.source.toLowerCase()
      : "";

  if (
    payment.status === "verified" ||
    source.includes("paystack") ||
    source.includes("checkout")
  ) {
    return "Via app";
  }

  return "Manual";
}

function getPaymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    bank_transfer: "Bank transfer",
    cash: "Cash",
    card: "Card",
    card_payment: "Card payment",
    other: "Other",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function getTenantPositions(params: {
  tenants: ManagerTenantRow[];
  units: ManagerUnitRow[];
  properties: ManagerPropertyRow[];
}) {
  const unitById = new Map(params.units.map((unit) => [unit.id, unit]));
  const propertyById = new Map(
    params.properties.map((property) => [property.id, property]),
  );

  return params.tenants
    .filter(
      (tenant) =>
        tenant.status === "active" || tenant.status === "eviction_notice",
    )
    .map<TenantRentPosition | null>((tenant) => {
      const unit = unitById.get(tenant.unit_id);
      const property = propertyById.get(tenant.property_id);
      const balance = Math.max(0, Number(tenant.current_balance));
      const days = daysFromToday(tenant.next_rent_due_date);

      if (balance > 0 || (days !== null && days < 0)) {
        const overdueDays = days !== null && days < 0 ? Math.abs(days) : null;

        return {
          tenant,
          unit,
          property,
          kind: "owing",
          label:
            overdueDays === null
              ? "Owing"
              : overdueDays === 0
                ? "Due today"
                : `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
          amountDue: balance > 0 ? balance : Number(tenant.rent_amount),
          daysUntilDue: days,
        };
      }

      if (days !== null && days <= 30) {
        return {
          tenant,
          unit,
          property,
          kind: "due_soon",
          label:
            days === 0
              ? "Due today"
              : `Due in ${days} day${days === 1 ? "" : "s"}`,
          amountDue: Number(tenant.rent_amount),
          daysUntilDue: days,
        };
      }

      return null;
    })
    .filter((item): item is TenantRentPosition => item !== null)
    .sort((first, second) => {
      if (first.kind !== second.kind) {
        return first.kind === "owing" ? -1 : 1;
      }

      return (first.daysUntilDue ?? 0) - (second.daysUntilDue ?? 0);
    });
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }[tone];

  return (
    <article className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
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

export function ManagerPaymentsOfflineView({
  initialLandlordClients,
  initialProperties,
  initialUnits,
  initialTenants,
  initialPayments,
  paystackPaymentRequests,
}: ManagerPaymentsOfflineViewProps) {
  const offline = useManagerOfflineData();
  const landlordClients = mergeManagerRows(
    initialLandlordClients,
    offline.landlordClients,
  );
  const properties = mergeManagerRows(initialProperties, offline.properties);
  const tenants = mergeManagerRows(initialTenants, offline.tenants);
  const units = applyOfflineTenantOccupancy(
    mergeManagerRows(initialUnits, offline.units),
    tenants,
  );
  const payments = mergeManagerRows(initialPayments, offline.payments);

  const [panel, setPanel] = useState<PaymentPanel>(null);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [paymentPage, setPaymentPage] = useState(1);
  const [rentPositionPage, setRentPositionPage] = useState(1);

  const tenantById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant])),
    [tenants],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );

  const reliablePayments = useMemo(
    () => payments.filter((payment) => reliablePaymentStatuses.has(payment.status)),
    [payments],
  );
  const positions = useMemo(
    () => getTenantPositions({ tenants, units, properties }),
    [properties, tenants, units],
  );
  const thisMonthPrefix = getTodayDateOnly().slice(0, 7);
  const totalCollected = reliablePayments.reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );
  const totalCommission = reliablePayments.reduce(
    (total, payment) => total + Number(payment.management_fee_amount),
    0,
  );
  const paymentsThisMonth = reliablePayments
    .filter((payment) => payment.payment_date.slice(0, 7) === thisMonthPrefix)
    .reduce((total, payment) => total + Number(payment.amount_paid), 0);
  const dueSoonTotal = positions
    .filter((position) => position.kind === "due_soon")
    .reduce((total, position) => total + position.amountDue, 0);
  const owingTotal = positions
    .filter((position) => position.kind === "owing")
    .reduce((total, position) => total + position.amountDue, 0);

  const visiblePayments = useMemo(() => {
    const safeQuery = query.trim().toLowerCase();

    return [...payments]
      .filter((payment) => {
        if (propertyFilter !== "all" && payment.property_id !== propertyFilter) {
          return false;
        }

        const source = getPaymentSource(payment);

        if (filter === "via_app" && source !== "Via app") {
          return false;
        }

        if (filter === "manual" && source !== "Manual") {
          return false;
        }

        if (filter !== "all" && filter !== "paid" && filter !== "via_app" && filter !== "manual") {
          return false;
        }

        if (filter === "paid" && !reliablePaymentStatuses.has(payment.status)) {
          return false;
        }

        if (!safeQuery) {
          return true;
        }

        const tenant = tenantById.get(payment.tenant_id);
        const unit = unitById.get(payment.unit_id);
        const property = propertyById.get(payment.property_id);

        return [
          tenant?.full_name,
          tenant?.phone_number,
          unit?.unit_label,
          property?.property_name,
          payment.payment_reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(safeQuery);
      })
      .sort(
        (first, second) =>
          new Date(second.payment_date).getTime() -
          new Date(first.payment_date).getTime(),
      );
  }, [filter, payments, propertyById, propertyFilter, query, tenantById, unitById]);

  const visiblePositions = useMemo(() => {
    if (filter !== "due_soon" && filter !== "owing" && filter !== "all") {
      return [];
    }

    const safeQuery = query.trim().toLowerCase();

    return positions.filter((position) => {
      if (filter === "due_soon" && position.kind !== "due_soon") {
        return false;
      }

      if (filter === "owing" && position.kind !== "owing") {
        return false;
      }

      if (
        propertyFilter !== "all" &&
        position.tenant.property_id !== propertyFilter
      ) {
        return false;
      }

      if (!safeQuery) {
        return true;
      }

      return [
        position.tenant.full_name,
        position.tenant.phone_number,
        position.unit?.unit_label,
        position.property?.property_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(safeQuery);
    });
  }, [filter, positions, propertyFilter, query]);

  const paymentPageCount = Math.max(
    1,
    Math.ceil(visiblePayments.length / TABLE_PAGE_SIZE),
  );
  const safePaymentPage = Math.min(paymentPage, paymentPageCount);
  const pagedPayments = visiblePayments.slice(
    (safePaymentPage - 1) * TABLE_PAGE_SIZE,
    safePaymentPage * TABLE_PAGE_SIZE,
  );
  const rentPositionPageCount = Math.max(
    1,
    Math.ceil(visiblePositions.length / TABLE_PAGE_SIZE),
  );
  const safeRentPositionPage = Math.min(
    rentPositionPage,
    rentPositionPageCount,
  );
  const pagedPositions = visiblePositions.slice(
    (safeRentPositionPage - 1) * TABLE_PAGE_SIZE,
    safeRentPositionPage * TABLE_PAGE_SIZE,
  );


  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-strong">
            Payments
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            See who paid, who is due soon, who is owing, and what your company earned.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setPanel(panel === "manual" ? null : "manual")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft"
          >
            {panel === "manual" ? <X size={17} /> : <Plus size={17} />}
            {panel === "manual" ? "Close payment form" : "Record manual payment"}
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "link" ? null : "link")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong"
          >
            {panel === "link" ? <X size={17} /> : <Link2 size={17} />}
            {panel === "link" ? "Close link form" : "Create payment link"}
          </button>
        </div>
      </header>

      {panel ? (
        <section
          id={panel === "manual" ? "record-manual-payment" : "create-payment-link"}
          className="grid scroll-mt-24 gap-5 xl:grid-cols-[460px_minmax(0,1fr)]"
        >
          {panel === "manual" ? (
            <ManagerPaymentForm
              landlordClients={landlordClients}
              properties={properties}
              units={units}
              tenants={tenants}
            />
          ) : (
            <ManagerPaystackPaymentLinkForm
              landlordClients={initialLandlordClients}
              properties={initialProperties}
              units={initialUnits}
              tenants={initialTenants}
            />
          )}

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-text-strong">
              {panel === "manual" ? "Before you record" : "Existing payment links"}
            </h2>
            {panel === "manual" ? (
              <div className="mt-4 rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
                Record only money that has already been received. BOPA will calculate the manager commission and amount due to the landlord from the property settings.
              </div>
            ) : (
              <div className="mt-4">
                <ManagerPaystackPaymentLinkList
                  properties={initialProperties}
                  units={initialUnits}
                  tenants={initialTenants}
                  paymentRequests={paystackPaymentRequests}
                />
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total collected"
          value={formatNaira(totalCollected)}
          description="Recorded and verified"
          icon={<Banknote size={21} strokeWidth={2.5} />}
          tone="success"
        />
        <SummaryCard
          label="Manager commission"
          value={formatNaira(totalCommission)}
          description="Revenue from rent records"
          icon={<WalletCards size={21} strokeWidth={2.5} />}
        />
        <SummaryCard
          label="Due soon"
          value={formatNaira(dueSoonTotal)}
          description={`${positions.filter((item) => item.kind === "due_soon").length} tenants`}
          icon={<CalendarClock size={21} strokeWidth={2.5} />}
          tone="warning"
        />
        <SummaryCard
          label="Owing"
          value={formatNaira(owingTotal)}
          description={`${positions.filter((item) => item.kind === "owing").length} tenants`}
          icon={<CircleDollarSign size={21} strokeWidth={2.5} />}
          tone="danger"
        />
        <SummaryCard
          label="Payments this month"
          value={formatNaira(paymentsThisMonth)}
          description={new Intl.DateTimeFormat("en-NG", {
            month: "long",
            year: "numeric",
          }).format(new Date())}
          icon={<CreditCard size={21} strokeWidth={2.5} />}
        />
      </section>

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border-soft p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["paid", "Paid"],
              ["due_soon", "Due soon"],
              ["owing", "Owing"],
              ["via_app", "Via app"],
              ["manual", "Manual"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value);
                  setPaymentPage(1);
                  setRentPositionPage(1);
                }}
                className={`min-h-10 rounded-button px-4 text-sm font-extrabold transition ${
                  filter === value
                    ? "bg-primary text-white"
                    : "border border-border-soft bg-white text-text-strong hover:bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-h-10 min-w-[260px] items-center gap-2 rounded-button border border-border-soft px-3">
              <Search size={17} className="text-text-muted" />
              <input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setQuery(event.target.value);
                  setPaymentPage(1);
                  setRentPositionPage(1);
                }}
                placeholder="Search tenant, unit, or property"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-text-muted"
              />
            </label>
            <select
              value={propertyFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setPropertyFilter(event.target.value);
                setPaymentPage(1);
                setRentPositionPage(1);
              }}
              className="min-h-10 rounded-button border border-border-soft bg-white px-3 text-sm font-bold text-text-strong outline-none"
            >
              <option value="all">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filter === "all" ||
          filter === "paid" ||
          filter === "via_app" ||
          filter === "manual") && (
          <div>
            <div className="border-b border-border-soft px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                  1
                </span>
                <h2 className="font-black text-text-strong">Recent payments</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-black text-text-muted">
                  {visiblePayments.length}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Confirmed and manually recorded rent payments.
              </p>
            </div>

            {visiblePayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Rent amount</th>
                      <th className="px-4 py-3">Amount paid</th>
                      <th className="px-4 py-3">Payment date</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {pagedPayments.map((payment) => {
                      const tenant = tenantById.get(payment.tenant_id);
                      const unit = unitById.get(payment.unit_id);
                      const property = propertyById.get(payment.property_id);
                      const receiptReady = reliablePaymentStatuses.has(payment.status);

                      return (
                        <tr key={payment.id}>
                          <td className="px-4 py-4">
                            <p className="text-sm font-black text-text-strong">
                              {tenant?.full_name ?? "Tenant"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-text-muted">
                              {tenant?.phone_number ?? "Phone not added"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-text-strong">
                            {unit?.unit_label ?? "Unit"}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-text-strong">
                            {property?.property_name ?? "Property"}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-text-strong">
                            {formatNaira(Number(payment.base_rent_amount || tenant?.rent_amount || 0))}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-text-strong">
                            {formatNaira(Number(payment.amount_paid))}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-text-strong">
                            {getPaymentSource(payment)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                payment.status === "verified"
                                  ? "bg-success-soft text-success"
                                  : payment.status === "recorded"
                                    ? "bg-primary-soft text-primary"
                                    : payment.status === "pending_confirmation"
                                      ? "bg-warning-soft text-warning"
                                      : "bg-surface text-text-muted"
                              }`}
                            >
                              {payment.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {receiptReady ? (
                              <Link
                                href={`/manager/receipts/${payment.id}/download`}
                                prefetch={false}
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-button border border-primary/20 px-3 text-xs font-extrabold text-primary hover:bg-primary-soft"
                              >
                                <ReceiptText size={15} />
                                View or generate receipt
                              </Link>
                            ) : (
                              <span className="text-xs font-semibold text-text-muted">
                                Awaiting confirmation
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border-soft px-4 py-3 text-sm font-semibold text-text-muted">
                  <span>
                    Showing {pagedPayments.length === 0 ? 0 : (safePaymentPage - 1) * TABLE_PAGE_SIZE + 1} to {(safePaymentPage - 1) * TABLE_PAGE_SIZE + pagedPayments.length} of {visiblePayments.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentPage((current) => Math.max(1, current - 1))}
                      disabled={safePaymentPage <= 1}
                      className="flex size-9 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="font-black text-text-strong">
                      {safePaymentPage} of {paymentPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaymentPage((current) => Math.min(paymentPageCount, current + 1))}
                      disabled={safePaymentPage >= paymentPageCount}
                      className="flex size-9 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-text-muted">
                No payment record matches this view.
              </div>
            )}
          </div>
        )}

        {(filter === "all" || filter === "due_soon" || filter === "owing") && (
          <div className="border-t border-border-soft">
            <div className="border-b border-border-soft px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                  2
                </span>
                <h2 className="font-black text-text-strong">Due soon and owing</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-black text-text-muted">
                  {visiblePositions.length}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Tenants who need a payment link or a manual payment record.
              </p>
            </div>

            {visiblePositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-surface text-xs font-black uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Next due</th>
                      <th className="px-4 py-3">Amount due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {pagedPositions.map((position) => (
                      <tr key={position.tenant.id}>
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-text-strong">
                            {position.tenant.full_name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-text-muted">
                            {position.tenant.phone_number}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-text-strong">
                          {position.unit?.unit_label ?? "Unit"}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-text-strong">
                          {position.property?.property_name ?? "Property"}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-text-muted">
                          {formatDate(position.tenant.next_rent_due_date)}
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-text-strong">
                          {formatNaira(position.amountDue)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              position.kind === "owing"
                                ? "bg-danger-soft text-danger"
                                : "bg-warning-soft text-warning"
                            }`}
                          >
                            {position.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPanel("link");
                                window.setTimeout(() => {
                                  document
                                    .getElementById("create-payment-link")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }, 50);
                              }}
                              className="inline-flex min-h-9 items-center justify-center rounded-button border border-primary/20 px-3 text-xs font-extrabold text-primary hover:bg-primary-soft"
                            >
                              Generate payment link
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPanel("manual");
                                window.setTimeout(() => {
                                  document
                                    .getElementById("record-manual-payment")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }, 50);
                              }}
                              className="inline-flex min-h-9 items-center justify-center rounded-button border border-border-soft px-3 text-xs font-extrabold text-text-strong hover:bg-surface"
                            >
                              Record payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border-soft px-4 py-3 text-sm font-semibold text-text-muted">
                  <span>
                    Showing {pagedPositions.length === 0 ? 0 : (safeRentPositionPage - 1) * TABLE_PAGE_SIZE + 1} to {(safeRentPositionPage - 1) * TABLE_PAGE_SIZE + pagedPositions.length} of {visiblePositions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRentPositionPage((current) => Math.max(1, current - 1))}
                      disabled={safeRentPositionPage <= 1}
                      className="flex size-9 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="font-black text-text-strong">
                      {safeRentPositionPage} of {rentPositionPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRentPositionPage((current) => Math.min(rentPositionPageCount, current + 1))}
                      disabled={safeRentPositionPage >= rentPositionPageCount}
                      className="flex size-9 items-center justify-center rounded-button border border-border-soft disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-text-muted">
                No tenant is due soon or owing in this view.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

