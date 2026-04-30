import { Building2, Home, ReceiptText, RefreshCcw, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordOverviewStats } from "@/server/services/overview.service";
import { formatNairaCompact } from "@/server/utils/money";

function getOverviewPrimaryAction(stats: {
  totalProperties: number;
  totalTenants: number;
}) {
  if (stats.totalProperties === 0) {
    return {
      href: "/properties/new",
      label: "Add First Property",
    };
  }

  if (stats.totalTenants === 0) {
    return {
      href: "/tenants/new",
      label: "Add First Tenant",
    };
  }

  return {
    href: "/payments",
    label: "Record Payment",
  };
}

export default async function OverviewPage() {
  const stats = await getCurrentLandlordOverviewStats();
  const primaryAction = getOverviewPrimaryAction(stats);
  const isFirstTimeSetup =
    stats.totalProperties === 0 &&
    stats.totalUnits === 0 &&
    stats.totalTenants === 0;

  const vacantUnitsDescription =
    stats.vacantUnits === 0 ? "All units occupied" : "Ready for tenants";

  return (
    <div>
      <PageHeader
        title="Overview"
        description="See your properties, tenants, rent payments, and renewals in one place."
        action={
          <Link href={primaryAction.href}>
            <Button>{primaryAction.label}</Button>
          </Link>
        }
      />

      {isFirstTimeSetup ? (
        <div className="mb-6 rounded-card border border-primary/15 bg-linear-to-br from-primary-soft to-white p-5 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-extrabold text-text-strong">
                Start by adding your first property
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
                Add the building or compound first, then add the rooms, flats,
                shops, or units under it. After that, you can add tenants and
                start tracking rent.
              </p>
            </div>

            <Link href="/properties/new">
              <Button>Add First Property</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link
          href="/payments?filter=this_year"
          aria-label="View rent collected this year"
          className="block rounded-card transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <StatCard
            title="Rent Collected"
            value={formatNairaCompact(stats.rentCollectedThisYear)}
            description="This year"
            tone="gold"
            icon={<ReceiptText size={22} strokeWidth={2.6} />}
          />
        </Link>

        <StatCard
          title="Total Units"
          value={String(stats.totalUnits)}
          description={`${stats.totalProperties} active ${
            stats.totalProperties === 1 ? "property" : "properties"
          }`}
          icon={<Building2 size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="Occupied Units"
          value={String(stats.occupiedUnits)}
          description="Currently rented"
          tone="success"
          icon={<Users size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="Vacant Units"
          value={String(stats.vacantUnits)}
          description={vacantUnitsDescription}
          tone="warning"
          icon={<Home size={22} strokeWidth={2.6} />}
        />

        <StatCard
          title="Renewals"
          value={String(stats.upcomingRenewals)}
          description="Coming up soon"
          tone="primary"
          icon={<RefreshCcw size={22} strokeWidth={2.6} />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Recent Payments"
          description="Payments you record will appear here with receipt status."
        >
          <EmptyState
            title="No payments recorded yet"
            description="When you record rent payments, they will appear here."
            action={
              <Link href="/payments">
                <Button variant="secondary">Record Payment</Button>
              </Link>
            }
            icon={<ReceiptText size={24} strokeWidth={2.6} />}
          />
        </SectionCard>

        <div className="space-y-6">
          <TrustNotice
            title="Your payment records are protected"
            description="Tenuro keeps a clear history of every payment, correction, tenant profile, and receipt."
          />

          <SectionCard
            title="Quick Actions"
            description="Common landlord tasks."
          >
            <div className="grid gap-3">
              <Link href="/properties/new">
                <Button fullWidth>Add Property</Button>
              </Link>

              <Link href="/tenants/new">
                <Button fullWidth variant="secondary">
                  Add Tenant
                </Button>
              </Link>

              <Link href="/payments">
                <Button fullWidth variant="secondary">
                  Record Payment
                </Button>
              </Link>

              <Link href="/settings">
                <Button fullWidth variant="secondary">
                  Set Up Bank Account
                </Button>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
