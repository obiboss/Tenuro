import Link from "next/link";
import { Suspense } from "react";
import {
  CaretakerActionButtons,
  CaretakerUpToDateActions,
} from "@/components/caretaker/caretaker-action-buttons";
import { CaretakerGreeting } from "@/components/caretaker/caretaker-greeting";
import { CaretakerOverviewSections } from "@/components/caretaker/caretaker-overview-sections";
import { CaretakerPropertyFilter } from "@/components/caretaker/caretaker-property-filter";
import { CaretakerSummaryCards } from "@/components/caretaker/caretaker-summary-cards";
import { Button } from "@/components/ui/button";
import { getCurrentCaretakerOverview } from "@/server/services/caretaker-overview.service";

type CaretakerOverviewPageProps = {
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

export default async function CaretakerOverviewPage({
  searchParams,
}: CaretakerOverviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const overview = await getCurrentCaretakerOverview(
    resolvedSearchParams.property ?? null,
  );

  if (!overview.hasAssignments) {
    return (
      <div className="space-y-3">
        <CaretakerGreeting caretakerName={overview.caretakerName} />

        <div className="rounded-card border border-primary/15 bg-linear-to-br from-primary-soft to-white p-4 shadow-card">
          <p className="text-base font-extrabold text-text-strong">
            You do not have any assigned properties yet.
          </p>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            Ask a landlord to invite you and assign you to their properties.
          </p>
        </div>
      </div>
    );
  }

  const allUpToDate =
    overview.hasTenants &&
    overview.dueSoonTenants.length === 0 &&
    overview.owingTenants.length === 0 &&
    overview.pendingConfirmation.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <CaretakerGreeting caretakerName={overview.caretakerName} />

        <Suspense fallback={<PropertyFilterFallback />}>
          <CaretakerPropertyFilter
            properties={overview.properties}
            selectedPropertyId={overview.selectedPropertyId}
            filterLabel={overview.propertyFilterLabel}
          />
        </Suspense>
      </div>

      {!overview.hasTenants ? (
        <div className="rounded-card border border-border-soft bg-white p-4">
          <p className="text-sm font-semibold text-text-muted">
            Your assigned properties do not have active tenants yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <CaretakerSummaryCards
            dueSoonCount={overview.summary.dueSoonCount}
            owingCount={overview.summary.owingCount}
            pendingConfirmationCount={overview.summary.pendingConfirmationCount}
            paidCount={overview.summary.paidCount}
            totalOutstanding={overview.summary.totalOutstanding}
          />

          <CaretakerActionButtons primaryAction={overview.primaryAction} />
        </div>
      )}

      {allUpToDate ? (
        <div className="rounded-card border border-border-soft bg-white p-4">
          <p className="text-sm font-semibold text-text-muted">
            All assigned tenants are up to date.
          </p>
          <div className="mt-3">
            <CaretakerUpToDateActions />
          </div>
        </div>
      ) : null}

      {overview.hasTenants ? (
        <CaretakerOverviewSections overview={overview} />
      ) : null}

      {overview.hasTenants ? (
        <div className="flex justify-center">
          <Link href="#paid-tenants">
            <Button variant="secondary" size="sm">
              View all tenants
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
