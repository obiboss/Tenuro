import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Home,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import { RenewTenancyButton } from "@/components/tenancy/renew-tenancy-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import {
  getCurrentLandlordRenewalOverview,
  type LandlordRenewalOverviewItem,
  type RenewalUrgency,
} from "@/server/services/tenancies.service";
import { formatNaira } from "@/server/utils/money";

const urgencyCopy: Record<
  RenewalUrgency,
  {
    label: string;
    tone: "primary" | "success" | "warning" | "danger";
    description: string;
  }
> = {
  overdue: {
    label: "Overdue",
    tone: "danger",
    description: "Renewal date has passed.",
  },
  due_today: {
    label: "Due today",
    tone: "warning",
    description: "Renewal is due today.",
  },
  within_30_days: {
    label: "Within 30 days",
    tone: "warning",
    description: "Follow up urgently.",
  },
  within_60_days: {
    label: "Within 60 days",
    tone: "primary",
    description: "Prepare renewal reminder.",
  },
  within_90_days: {
    label: "Within 90 days",
    tone: "primary",
    description: "Upcoming renewal window.",
  },
  later: {
    label: "Later",
    tone: "success",
    description: "No immediate action.",
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getDaysText(daysUntilDue: number | null) {
  if (daysUntilDue === null) {
    return "No date";
  }

  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} day${
      Math.abs(daysUntilDue) === 1 ? "" : "s"
    } overdue`;
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  return `${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} left`;
}

function RenewalCard({ item }: { item: LandlordRenewalOverviewItem }) {
  const tenancy = item.tenancy;
  const tenant = tenancy.tenants;
  const unit = tenancy.units;
  const property = unit?.properties;
  const copy = urgencyCopy[item.urgency];

  return (
    <article className="rounded-card border border-border-soft bg-white p-5 shadow-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={copy.tone}>{copy.label}</Badge>
            <p className="text-sm font-bold text-text-muted">
              {getDaysText(item.daysUntilDue)}
            </p>
          </div>

          <h2 className="mt-3 text-lg font-extrabold text-text-strong">
            {tenant?.full_name ?? "Tenant"}
          </h2>

          <p className="mt-1 text-sm leading-6 text-text-muted">
            {property?.property_name ?? "Property not set"} ·{" "}
            {unit?.unit_identifier ?? "Unit not set"}
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-sm font-bold text-text-muted">Renewal Due</p>
          <p className="mt-1 text-lg font-extrabold text-text-strong">
            {formatDate(tenancy.next_rent_charge_date)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-button bg-background p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarClock aria-hidden="true" size={17} strokeWidth={2.5} />
            <p className="text-xs font-bold uppercase tracking-wide">
              Current Period
            </p>
          </div>

          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {formatDate(tenancy.current_period_start ?? tenancy.start_date)}
          </p>
          <p className="text-sm font-extrabold text-text-strong">
            {formatDate(tenancy.current_period_end ?? tenancy.end_date)}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <WalletCards aria-hidden="true" size={17} strokeWidth={2.5} />
            <p className="text-xs font-bold uppercase tracking-wide">Rent</p>
          </div>

          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {formatNaira(tenancy.rent_amount)}
          </p>
          <p className="mt-1 text-xs font-semibold capitalize text-text-muted">
            {tenancy.payment_frequency}
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <AlertTriangle aria-hidden="true" size={17} strokeWidth={2.5} />
            <p className="text-xs font-bold uppercase tracking-wide">Balance</p>
          </div>

          <p className="mt-2 text-sm font-extrabold text-text-strong">
            {formatNaira(Math.max(item.outstandingBalance, 0))}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {item.outstandingBalance > 0 ? "Outstanding" : "Cleared"}
          </p>
        </div>

        <div className="rounded-button bg-primary-soft p-4">
          <div className="flex items-center gap-2 text-primary">
            <Clock3 aria-hidden="true" size={17} strokeWidth={2.5} />
            <p className="text-xs font-bold uppercase tracking-wide">
              Guidance
            </p>
          </div>

          <p className="mt-2 text-sm font-bold leading-6 text-text-normal">
            {copy.description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-button bg-background p-4 md:grid-cols-[1fr_220px] md:items-center">
        <p className="text-sm leading-6 text-text-muted">
          Renewing posts a new rent charge for the next period. Any old unpaid
          balance remains in the ledger and is added to the tenant’s total
          outstanding balance.
        </p>

        <RenewTenancyButton tenancyId={tenancy.id} />
      </div>

      <div className="mt-4">
        <Link
          href={`/tenants/${tenancy.tenant_id}`}
          className="inline-flex text-sm font-extrabold text-primary hover:text-primary-hover"
        >
          View tenant record
        </Link>
      </div>
    </article>
  );
}

export default async function RenewalsPage() {
  const renewalOverview = await getCurrentLandlordRenewalOverview();

  return (
    <div>
      <PageHeader
        title="Renewals"
        description="Track tenant rent calendars, renewal dates, and upcoming rent charge windows."
        action={<Badge tone="primary">Live Tracking</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Overdue"
          value={String(renewalOverview.summary.overdue)}
          description="Past renewal date"
          tone="danger"
          icon={<AlertTriangle size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="Due Today"
          value={String(renewalOverview.summary.dueToday)}
          description="Needs action now"
          tone="warning"
          icon={<Clock3 size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="30 Days"
          value={String(renewalOverview.summary.within30Days)}
          description="Urgent window"
          tone="warning"
          icon={<RefreshCcw size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="60 Days"
          value={String(renewalOverview.summary.within60Days)}
          description="Prepare reminder"
          tone="primary"
          icon={<CalendarClock size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="90 Days"
          value={String(renewalOverview.summary.within90Days)}
          description="Upcoming"
          tone="primary"
          icon={<Home size={22} strokeWidth={2.6} />}
        />
      </div>

      <div className="mt-6">
        <SectionCard
          title="Renewal Tracking"
          description="Active tenancies are grouped by their next rent charge or renewal due date."
        >
          {renewalOverview.items.length === 0 ? (
            <EmptyState
              title="No active renewal records yet"
              description="When active tenancies have rent calendar dates, they will appear here."
              icon={
                <RefreshCcw aria-hidden="true" size={24} strokeWidth={2.6} />
              }
            />
          ) : (
            <div className="space-y-4">
              {renewalOverview.items.map((item) => (
                <RenewalCard key={item.tenancy.id} item={item} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
