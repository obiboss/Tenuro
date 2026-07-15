import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleAlert,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  ManagerOverview,
  ManagerOverviewAttentionTone,
} from "@/server/repositories/manager.repository";

type ManagerOperationalOverviewProps = {
  managerName: string;
  overview: ManagerOverview;
};

type ToneClasses = {
  border: string;
  text: string;
  background: string;
};

const toneClasses: Record<ManagerOverviewAttentionTone, ToneClasses> = {
  danger: {
    border: "border-danger/30",
    text: "text-danger",
    background: "bg-danger-soft",
  },
  warning: {
    border: "border-warning/30",
    text: "text-warning",
    background: "bg-warning-soft",
  },
  neutral: {
    border: "border-border-soft",
    text: "text-text-muted",
    background: "bg-surface",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-NG");

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Manager";
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Lagos",
    }).format(new Date()),
  );

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

function formatAttentionCount(value: number) {
  return value > 0 ? numberFormatter.format(value) : "-";
}

function getToneClasses(tone: ManagerOverviewAttentionTone) {
  return toneClasses[tone];
}

export function ManagerOperationalOverview({
  managerName,
  overview,
}: ManagerOperationalOverviewProps) {
  const visibleAttentionItems = overview.attentionItems.slice(0, 5);
  const primaryAction = overview.primaryAction;
  const canRecordFirstPayment =
    overview.totals.totalProperties > 0 && overview.totals.totalTenants > 0;

  const rentPositionItems = [
    {
      label: "Tenants",
      value: numberFormatter.format(overview.rentPosition.totalTenants),
    },
    {
      label: "Owing",
      value: numberFormatter.format(overview.rentPosition.owingTenants),
    },
    {
      label: "Due soon",
      value: numberFormatter.format(overview.rentPosition.dueSoonTenants),
    },
    {
      label: "Rent collected",
      value: formatCurrency(overview.rentPosition.rentCollected),
    },
    {
      label: "Vacant units",
      value: numberFormatter.format(overview.rentPosition.vacantUnits),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-text-strong sm:text-2xl">
            {getGreeting()}, {getFirstName(managerName)}
          </h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            Here is what needs your attention today.
          </p>
        </div>

        <Link
          href={primaryAction.href}
          prefetch={false}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {primaryAction.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <section
        aria-labelledby="manager-attention-title"
        className="rounded-lg border border-border-soft bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
          <div>
            <h2
              id="manager-attention-title"
              className="text-base font-black text-text-strong"
            >
              Needs attention
            </h2>
            <p className="text-xs font-semibold text-text-muted">
              Highest-priority work first
            </p>
          </div>
          <CircleAlert className="size-5 text-text-muted" aria-hidden="true" />
        </div>

        {visibleAttentionItems.length > 0 ? (
          <ul className="divide-y divide-border-soft">
            {visibleAttentionItems.map((item) => {
              const classes = getToneClasses(item.tone);

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          item.tone === "danger"
                            ? "bg-danger"
                            : item.tone === "warning"
                              ? "bg-warning"
                              : "bg-text-muted",
                        )}
                        aria-hidden="true"
                      />
                      <p className="text-sm font-extrabold text-text-strong">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-text-normal">
                      {item.subject}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-text-muted">
                      {item.detail}
                    </p>
                  </div>

                  <Link
                    href={item.action.href}
                    prefetch={false}
                    className={cn(
                      "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      classes.border,
                      classes.background,
                      classes.text,
                    )}
                  >
                    {item.action.label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-2.5">
            <p className="text-sm font-semibold text-text-muted">
              Nothing needs your attention right now.
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="manager-rent-position-title"
        className="rounded-lg border border-border-soft bg-white px-4 py-2.5"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <h2
            id="manager-rent-position-title"
            className="shrink-0 text-base font-black text-text-strong"
          >
            Rent position
          </h2>

          <dl className="flex flex-wrap gap-x-6 gap-y-1.5">
            {rentPositionItems.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline gap-1.5 text-sm"
              >
                <dt className="font-semibold text-text-muted">{item.label}</dt>
                <dd className="font-black text-text-strong">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="manager-upcoming-rent-title"
          className="rounded-lg border border-border-soft bg-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
            <div>
              <h2
                id="manager-upcoming-rent-title"
                className="text-base font-black text-text-strong"
              >
                Upcoming rent
              </h2>
              <p className="text-xs font-semibold text-text-muted">
                Due within 30 days
              </p>
            </div>
            <CalendarDays
              className="size-5 text-text-muted"
              aria-hidden="true"
            />
          </div>

          {overview.upcomingRent.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {overview.upcomingRent.map((item) => {
                const classes = getToneClasses(item.tone);

                return (
                  <li key={item.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-text-strong">
                          {item.tenantName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          {item.propertyName} - {item.unitLabel}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-text-strong">
                        {formatCurrency(item.amountDue)}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-extrabold",
                          classes.background,
                          classes.text,
                        )}
                      >
                        {item.stateLabel}
                      </span>
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <span className="text-xs font-semibold text-text-muted">
                          {formatDate(item.dueDate)}
                        </span>
                        <Link
                          href={item.action.href}
                          prefetch={false}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-primary underline-offset-4 transition hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {item.action.label}
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-text-muted">
                No rent is due in the next 30 days.
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="manager-recent-activity-title"
          className="rounded-lg border border-border-soft bg-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
            <div>
              <h2
                id="manager-recent-activity-title"
                className="text-base font-black text-text-strong"
              >
                Recent activity
              </h2>
              <p className="text-xs font-semibold text-text-muted">
                Latest operational changes
              </p>
            </div>
            <Clock3 className="size-5 text-text-muted" aria-hidden="true" />
          </div>

          {overview.recentActivity.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {overview.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={activity.href}
                    prefetch={false}
                    className="flex min-h-12 items-center justify-between gap-4 px-4 py-2.5 transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <span className="text-sm font-semibold text-text-normal">
                      {activity.description}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-text-muted">
                      {formatDate(activity.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-text-muted">
                No payments recorded yet.
              </p>

              {canRecordFirstPayment ? (
                <Link
                  href="/manager/payments"
                  prefetch={false}
                  className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-extrabold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Record first payment
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <section
        aria-labelledby="manager-properties-title"
        className="rounded-lg border border-border-soft bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
          <div>
            <h2
              id="manager-properties-title"
              className="text-base font-black text-text-strong"
            >
              Properties
            </h2>
            <p className="text-xs font-semibold text-text-muted">
              Occupancy and rent attention by property
            </p>
          </div>
          <Building2 className="size-5 text-text-muted" aria-hidden="true" />
        </div>

        {overview.propertySummaries.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-soft bg-surface text-xs font-black text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Property
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Landlord
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Units
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Occupied
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Vacant
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Unavailable
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Needs attention
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {overview.propertySummaries.map((property) => (
                    <tr key={property.id} className="hover:bg-surface">
                      <td className="px-4 py-2.5">
                        <Link
                          href={property.href}
                          prefetch={false}
                          className="font-extrabold text-text-strong underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {property.propertyName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-text-muted">
                        {property.landlordName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-text-normal">
                        {numberFormatter.format(property.totalUnits)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-text-normal">
                        {numberFormatter.format(property.occupiedUnits)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-text-normal">
                        {numberFormatter.format(property.vacantUnits)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-text-normal">
                        {numberFormatter.format(property.unavailableUnits)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-text-strong">
                        {formatAttentionCount(property.needsAttentionCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border-soft md:hidden">
              {overview.propertySummaries.map((property) => (
                <Link
                  key={property.id}
                  href={property.href}
                  prefetch={false}
                  className="block px-4 py-3 transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-text-strong">
                        {property.propertyName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {property.landlordName}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-0.5 size-4 shrink-0 text-text-muted"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-text-normal">
                    <span>{numberFormatter.format(property.totalUnits)} units</span>
                    <span>
                      {numberFormatter.format(property.occupiedUnits)} occupied
                    </span>
                    <span>
                      {numberFormatter.format(property.vacantUnits)} vacant
                    </span>
                    <span>
                      {numberFormatter.format(property.unavailableUnits)} unavailable
                    </span>
                    <span>
                      {formatAttentionCount(property.needsAttentionCount)} needs
                      attention
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-text-muted">
              No properties have been added yet.
            </p>
            <Link
              href="/manager/properties/new"
              prefetch={false}
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-extrabold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Add property
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
