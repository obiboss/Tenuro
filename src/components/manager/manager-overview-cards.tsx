import Link from "next/link";
import type {
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerOverviewCardsProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
};

type AttentionTone = "danger" | "warning";

type AttentionItem = {
  id: string;
  tenantName: string;
  propertyName: string;
  unitLabel: string;
  issue: string;
  tone: AttentionTone;
  sortScore: number;
};

type StatCardProps = {
  label: string;
  value: number;
  icon: "property" | "tenant" | "receipt";
};

function BuildingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M4.75 21.25A1.75 1.75 0 0 1 3 19.5V7.83c0-.72.44-1.36 1.1-1.63l7-2.8A1.75 1.75 0 0 1 13.5 5.03V9h5.75A1.75 1.75 0 0 1 21 10.75v8.75a1.75 1.75 0 0 1-1.75 1.75h-3.5v-4.5a1.25 1.25 0 0 0-1.25-1.25h-5a1.25 1.25 0 0 0-1.25 1.25v4.5h-3.5Zm3.5-12.5a1 1 0 1 0 0-2h-.5a1 1 0 1 0 0 2h.5Zm0 4a1 1 0 1 0 0-2h-.5a1 1 0 1 0 0 2h.5Zm5-4a1 1 0 1 0 0-2h-.5a1 1 0 1 0 0 2h.5Zm0 4a1 1 0 1 0 0-2h-.5a1 1 0 1 0 0 2h.5Zm5 1.5a1 1 0 1 0 0-2h-.5a1 1 0 1 0 0 2h.5Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M9.75 11.75a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 1.5c-3.38 0-6.25 1.86-6.25 4.25v.75c0 .96.79 1.75 1.75 1.75h9c.96 0 1.75-.79 1.75-1.75v-.75c0-2.39-2.87-4.25-6.25-4.25Zm7.68-1.4a3.25 3.25 0 1 0-2.36-5.95 5.5 5.5 0 0 1-.84 5.57c.84.18 1.64.46 2.36.82.27-.24.55-.39.84-.44Zm.42 1.84c-.33 0-.65.03-.96.09 1.1.93 1.86 2.18 1.86 3.72v.75c0 .62-.15 1.21-.42 1.72h1.92c.96 0 1.75-.78 1.75-1.75v-.53c0-2.25-1.94-4-4.15-4Z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M6.75 3A2.75 2.75 0 0 0 4 5.75v14.1c0 .84.9 1.37 1.63.95l1.58-.9 1.58.9c.34.2.77.2 1.11 0l1.58-.9 1.58.9c.34.2.77.2 1.11 0l1.58-.9 1.58.9c.73.42 1.63-.11 1.63-.95V5.75A2.75 2.75 0 0 0 16.25 3h-9.5Zm1.5 5.25h7.5a1 1 0 1 1 0 2h-7.5a1 1 0 0 1 0-2Zm0 4h7.5a1 1 0 1 1 0 2h-7.5a1 1 0 1 1 0-2Zm0 4h4.5a1 1 0 1 1 0 2h-4.5a1 1 0 1 1 0-2Z" />
    </svg>
  );
}

function StatIcon({ icon }: { icon: StatCardProps["icon"] }) {
  return (
    <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
      {icon === "property" ? <BuildingIcon /> : null}
      {icon === "tenant" ? <PeopleIcon /> : null}
      {icon === "receipt" ? <ReceiptIcon /> : null}
    </span>
  );
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-text-strong">
            {value.toLocaleString("en-NG")}
          </p>
        </div>

        <StatIcon icon={icon} />
      </div>
    </div>
  );
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function buildAttentionItems(params: {
  tenants: ManagerTenantRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
}): AttentionItem[] {
  const propertyNameById = new Map(
    params.properties.map((property) => [property.id, property.property_name]),
  );

  const unitLabelById = new Map(
    params.units.map((unit) => [unit.id, unit.unit_label]),
  );

  const attentionItems: AttentionItem[] = [];

  for (const tenant of params.tenants) {
    if (tenant.status !== "active") {
      continue;
    }

    const currentBalance = Number(tenant.current_balance);
    const daysFromToday = getDaysFromToday(tenant.next_rent_due_date);

    const baseItem = {
      id: tenant.id,
      tenantName: tenant.full_name,
      propertyName: propertyNameById.get(tenant.property_id) ?? "Property",
      unitLabel: unitLabelById.get(tenant.unit_id) ?? "Unit",
    };

    if (currentBalance > 0) {
      attentionItems.push({
        ...baseItem,
        issue: `owing ${formatNaira(currentBalance)}`,
        tone: "danger",
        sortScore: 1_000_000 + currentBalance,
      });

      continue;
    }

    if (daysFromToday !== null && daysFromToday < 0) {
      const overdueDays = Math.abs(daysFromToday);

      attentionItems.push({
        ...baseItem,
        issue: `overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        tone: "danger",
        sortScore: 900_000 + overdueDays,
      });

      continue;
    }

    if (daysFromToday !== null && daysFromToday <= 30) {
      attentionItems.push({
        ...baseItem,
        issue:
          daysFromToday === 0
            ? "due today"
            : `due in ${daysFromToday} day${daysFromToday === 1 ? "" : "s"}`,
        tone: "warning",
        sortScore: 100_000 - daysFromToday,
      });
    }
  }

  return attentionItems.sort(
    (firstItem, secondItem) => secondItem.sortScore - firstItem.sortScore,
  );
}

function getAttentionClassName(tone: AttentionTone) {
  return tone === "danger"
    ? "bg-danger-soft text-danger"
    : "bg-warning-soft text-warning";
}

export function ManagerOverviewCards({
  properties,
  units,
  tenants,
  payments,
}: ManagerOverviewCardsProps) {
  const attentionItems = buildAttentionItems({
    tenants,
    properties,
    units,
  });

  const visibleAttentionItems = attentionItems.slice(0, 5);
  const hiddenAttentionCount =
    attentionItems.length - visibleAttentionItems.length;

  const emptyMessage =
    properties.length === 0
      ? "No properties yet. Add one to start tracking who owes rent."
      : tenants.length === 0
        ? "No tenants yet. Open a property and add its units."
        : "Nothing needs attention right now.";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black tracking-tight text-text-strong">
          Needs attention
        </h1>

        <Link
          href="/manager/properties"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Add property
        </Link>
      </section>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        {visibleAttentionItems.length > 0 ? (
          <div className="divide-y divide-border-soft">
            {visibleAttentionItems.map((item) => (
              <Link
                key={item.id}
                href={`/manager/tenants#tenant-${item.id}`}
                prefetch={false}
                className="block rounded-button px-1 py-4 transition hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-black text-text-strong">
                      {item.tenantName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {item.unitLabel} · {item.propertyName}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getAttentionClassName(
                      item.tone,
                    )}`}
                  >
                    {item.issue}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold leading-6 text-text-muted">
            {emptyMessage}
          </p>
        )}

        {hiddenAttentionCount > 0 ? (
          <Link
            href="/manager/tenants"
            prefetch={false}
            className="mt-3 inline-flex text-sm font-black text-primary underline-offset-4 hover:underline"
          >
            View all ({attentionItems.length})
          </Link>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Properties"
          value={properties.length}
          icon="property"
        />

        <StatCard label="Tenants" value={tenants.length} icon="tenant" />

        <StatCard label="Rent records" value={payments.length} icon="receipt" />
      </section>
    </div>
  );
}
