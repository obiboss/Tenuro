import Link from "next/link";
import type { ManagerOverview } from "@/server/repositories/manager.repository";

type ManagerOverviewCardsProps = {
  overview: ManagerOverview;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const quickActions = [
  {
    label: "Add landlord",
    href: "/manager/landlords/new",
  },
  {
    label: "Add property",
    href: "/manager/properties/new",
  },
  {
    label: "Add tenant",
    href: "/manager/tenants/new",
  },
  {
    label: "Record payment",
    href: "/manager/payments/new",
  },
] as const;

export function ManagerOverviewCards({ overview }: ManagerOverviewCardsProps) {
  const cards = [
    {
      label: "Landlord clients",
      value: overview.totals.landlordClients.toLocaleString("en-NG"),
    },
    {
      label: "Properties",
      value: overview.totals.totalProperties.toLocaleString("en-NG"),
    },
    {
      label: "Units",
      value: overview.totals.totalUnits.toLocaleString("en-NG"),
    },
    {
      label: "Tenants",
      value: overview.totals.totalTenants.toLocaleString("en-NG"),
    },
    {
      label: "Rent recorded",
      value: formatNaira(overview.totals.totalRecordedPayments),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-text-strong">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Quick actions
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Start the common tasks property managers handle every day.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-14 items-center justify-center rounded-button bg-primary px-4 text-center text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Recent payments
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Recent rent records will appear here as your team records payments.
          </p>
        </div>

        {overview.recentPayments.length > 0 ? (
          <div className="mt-4 divide-y divide-border-soft">
            {overview.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-extrabold text-text-strong">
                    {payment.tenantName}
                  </p>
                  <p className="text-sm font-semibold text-text-muted">
                    {payment.propertyName} · {payment.unitLabel}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="font-black text-text-strong">
                    {formatNaira(payment.amountPaid)}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    {payment.status.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              No rent payments have been recorded yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
