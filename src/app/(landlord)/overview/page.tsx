import Link from "next/link";
import { Suspense } from "react";
import { Bell, Users } from "lucide-react";
import {
  OverviewActionButtons,
  OverviewEmptyStateActions,
  OverviewUpToDateActions,
} from "@/components/overview/overview-action-buttons";
import { LandlordGreeting } from "@/components/overview/landlord-greeting";
import { OverviewNeedsAttentionList } from "@/components/overview/overview-needs-attention";
import { OverviewPropertyFilter } from "@/components/overview/overview-property-filter";
import { OverviewRecentActivity } from "@/components/overview/overview-recent-activity";
import { OverviewSummaryCards } from "@/components/overview/overview-summary-cards";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordRentControlOverview } from "@/server/services/rent-control-overview.service";

type OverviewPageProps = {
  searchParams: Promise<{
    property?: string;
  }>;
};

function PropertyFilterFallback() {
  return (
    <div className="inline-flex min-h-11 items-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-bold text-text-muted">
      Loading properties...
    </div>
  );
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const overview = await getCurrentLandlordRentControlOverview(
    resolvedSearchParams.property ?? null,
  );

  const showEmptyOnboarding = !overview.hasTenants;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <LandlordGreeting landlordName={overview.landlordName} />

        <div className="flex items-center gap-3 self-start">
          <Suspense fallback={<PropertyFilterFallback />}>
            <OverviewPropertyFilter
              properties={overview.properties}
              selectedPropertyId={overview.selectedPropertyId}
              filterLabel={overview.propertyFilterLabel}
            />
          </Suspense>

          <Link
            href="/notifications"
            aria-label="Rent alerts"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-button border border-border-soft bg-white text-text-strong transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Bell aria-hidden="true" size={18} strokeWidth={2.6} />
          </Link>
        </div>
      </div>

      {showEmptyOnboarding ? (
        <div className="rounded-card border border-primary/15 bg-linear-to-br from-primary-soft to-white p-5 shadow-card">
          <p className="text-lg font-extrabold text-text-strong">
            Add your first tenant to start tracking rent
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Add your first tenant to start tracking rent, receipts, and reminders.
          </p>
          <div className="mt-4">
            <OverviewEmptyStateActions />
          </div>
        </div>
      ) : (
        <>
          <OverviewSummaryCards
            paidCount={overview.summary.paidCount}
            owingCount={overview.summary.owingCount}
            dueSoonCount={overview.summary.dueSoonCount}
            totalOutstanding={overview.summary.totalOutstanding}
          />

          <SectionCard
            title="Main actions"
            description="Take the next rent step quickly."
          >
            <OverviewActionButtons primaryAction={overview.primaryAction} />
          </SectionCard>
        </>
      )}

      {!showEmptyOnboarding ? (
        <div id="needs-attention">
          <SectionCard
            title="Needs Attention"
            description={
              overview.needsAttention.length > 0
                ? "Tenants who need a reminder, payment, or receipt."
                : "All tenants are up to date."
            }
          >
            {overview.needsAttention.length > 0 ? (
              <OverviewNeedsAttentionList items={overview.needsAttention} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold leading-6 text-text-muted">
                  All tenants are up to date.
                </p>
                <OverviewUpToDateActions />
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {overview.showRecentActivity ? (
        <OverviewRecentActivity events={overview.recentActivity} />
      ) : null}

      {overview.hasTenants ? (
        <div className="flex justify-center pt-2">
          <Link href="/tenants">
            <Button variant="secondary">
              <Users aria-hidden="true" size={18} strokeWidth={2.6} />
              View all tenants
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
