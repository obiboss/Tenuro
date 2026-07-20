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
    <span className="inline-flex h-8 items-center rounded-full border border-border-soft bg-white px-3 text-xs font-bold text-text-muted">
      Loading...
    </span>
  );
}

function NoPropertyLabel() {
  return (
    <span className="inline-flex h-8 items-center rounded-full border border-border-soft bg-white px-3 text-xs font-bold text-text-muted">
      No property yet
    </span>
  );
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const overview = await getCurrentLandlordRentControlOverview(
    resolvedSearchParams.property ?? null,
  );

  const hasProperties = overview.properties.length > 0;
  const showEmptyOnboarding = !overview.hasTenants;
  const onboardingStep = hasProperties ? "tenant" : "property";
  const onboardingTitle = hasProperties
    ? "Add your first tenant to start tracking rent"
    : "Add your first property to get started";
  const onboardingDescription = hasProperties
    ? "Track rent, receipts, and reminders from here."
    : "Set up the property first. You can add its units and tenants next.";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <LandlordGreeting landlordName={overview.landlordName} />

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {hasProperties ? (
            <Suspense fallback={<PropertyFilterFallback />}>
              <OverviewPropertyFilter
                properties={overview.properties}
                selectedPropertyId={overview.selectedPropertyId}
                filterLabel={overview.propertyFilterLabel}
              />
            </Suspense>
          ) : (
            <NoPropertyLabel />
          )}

          <Link
            href="/notifications"
            aria-label="Rent alerts"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-soft bg-white text-text-strong transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Bell aria-hidden="true" size={16} strokeWidth={2.6} />
          </Link>
        </div>
      </div>

      {showEmptyOnboarding ? (
        <div className="rounded-card border border-primary/15 bg-linear-to-br from-primary-soft to-white p-4 shadow-card">
          <p className="text-base font-extrabold text-text-strong">
            {onboardingTitle}
          </p>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            {onboardingDescription}
          </p>
          <div className="mt-3">
            <OverviewEmptyStateActions step={onboardingStep} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <OverviewSummaryCards
            paidCount={overview.summary.paidCount}
            owingCount={overview.summary.owingCount}
            dueSoonCount={overview.summary.dueSoonCount}
            totalOutstanding={overview.summary.totalOutstanding}
          />

          <OverviewActionButtons primaryAction={overview.primaryAction} />
        </div>
      )}

      {!showEmptyOnboarding ? (
        <div id="needs-attention" className="pt-1">
          <SectionCard
            title="Needs Attention"
            description={
              overview.needsAttention.length > 0
                ? undefined
                : "All tenants are up to date."
            }
            contentClassName="p-4 md:p-5"
            className="[&>div:first-child]:px-4 [&>div:first-child]:py-3 [&>div:first-child]:md:px-5"
          >
            {overview.needsAttention.length > 0 ? (
              <OverviewNeedsAttentionList items={overview.needsAttention} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-muted">
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
        <div className="flex justify-center">
          <Link href="/tenants">
            <Button variant="secondary" size="sm">
              <Users aria-hidden="true" size={16} strokeWidth={2.6} />
              View all tenants
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
