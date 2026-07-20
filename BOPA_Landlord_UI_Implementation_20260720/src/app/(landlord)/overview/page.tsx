import Link from "next/link";
import { Suspense } from "react";
import {
  Bell,
  Building2,
  Check,
  FileCheck2,
  Home,
  Info,
  Plus,
  Users,
} from "lucide-react";
import { OverviewNeedsAttentionList } from "@/components/overview/overview-needs-attention";
import { OverviewPropertyFilter } from "@/components/overview/overview-property-filter";
import { OverviewRecentActivity } from "@/components/overview/overview-recent-activity";
import { OverviewSummaryCards } from "@/components/overview/overview-summary-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSubmittedForLandlordReview } from "@/server/constants/onboarding-lifecycle";
import { getCurrentLandlordProperties } from "@/server/services/properties.service";
import { getCurrentLandlordRentControlOverview } from "@/server/services/rent-control-overview.service";
import { getCurrentLandlordTenantsWithPipeline } from "@/server/services/tenants.service";
import { cn } from "@/lib/cn";

type OverviewPageProps = {
  searchParams: Promise<{
    property?: string;
  }>;
};

type SetupStep = "property" | "unit" | "tenant";

function PropertyFilterFallback() {
  return (
    <span className="inline-flex min-h-10 items-center rounded-full border border-border-soft bg-white px-4 text-sm font-bold text-text-muted">
      Loading...
    </span>
  );
}

function SetupProgress({ currentStep }: { currentStep: SetupStep }) {
  const stepNumber =
    currentStep === "property" ? 1 : currentStep === "unit" ? 2 : 4;
  const steps = [
    { number: 1, label: "Property" },
    { number: 2, label: "Units" },
    { number: 3, label: "Rules" },
    { number: 4, label: "Tenants" },
  ];

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Property setup progress">
      {steps.map((step) => {
        const complete = step.number < stepNumber;
        const current = step.number === stepNumber;
        const rulesOptional = step.number === 3 && currentStep === "tenant";

        return (
          <li
            key={step.number}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-center text-xs font-extrabold sm:text-sm",
              complete
                ? "border-success/20 bg-success-soft text-success"
                : current
                  ? "border-primary/25 bg-primary-soft text-primary"
                  : "border-border-soft bg-background text-text-muted",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                complete
                  ? "bg-success text-white"
                  : current
                    ? "bg-primary text-white"
                    : "bg-border-soft text-text-muted",
              )}
            >
              {complete ? (
                <Check aria-hidden="true" size={14} strokeWidth={3} />
              ) : (
                step.number
              )}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
            {rulesOptional ? <span className="sr-only">Optional</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function NewLandlordSetup({
  step,
  firstPropertyId,
}: {
  step: SetupStep;
  firstPropertyId: string | null;
}) {
  const isPropertyStep = step === "property";
  const isUnitStep = step === "unit";
  const title = isPropertyStep
    ? "First, add your property"
    : isUnitStep
      ? "Now, add an apartment or unit"
      : "Now, add your first tenant";
  const description = isPropertyStep
    ? "Tell us the name and address of the property you own. After this, we’ll help you add its apartments or units."
    : isUnitStep
      ? "Add the flat, room, shop or apartment you want to manage."
      : "Choose whether the person is a new tenant or already lives in the apartment.";
  const href = isPropertyStep
    ? "/properties/new"
    : isUnitStep
      ? `/properties/${firstPropertyId ?? ""}#property-units-top`
      : "/tenants/new";
  const label = isPropertyStep
    ? "Add my first property"
    : isUnitStep
      ? "Add my first unit"
      : "Add my first tenant";
  const Icon = isPropertyStep ? Building2 : isUnitStep ? Home : Users;

  return (
    <section className="space-y-4" aria-labelledby="setup-heading">
      <div>
        <h1
          id="setup-heading"
          className="text-2xl font-black tracking-tight text-text-strong md:text-3xl"
        >
          Set up your property
        </h1>
        <p className="mt-1 text-base font-semibold text-text-muted">
          We’ll guide you one step at a time.
        </p>
      </div>

      <SetupProgress currentStep={step} />

      <div className="rounded-card border border-border-soft bg-white p-5 shadow-card md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon aria-hidden="true" size={28} strokeWidth={2.5} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-text-strong md:text-2xl">
                {title}
              </h2>
              <p className="mt-2 text-base font-medium leading-7 text-text-muted">
                {description}
              </p>

              <Link href={href} className="mt-6 block sm:max-w-sm">
                <Button size="lg" fullWidth>
                  <Plus aria-hidden="true" size={20} strokeWidth={2.8} />
                  {label}
                </Button>
              </Link>

              {step === "tenant" && firstPropertyId ? (
                <Link
                  href={`/properties/${firstPropertyId}#property-rules`}
                  className="mt-4 inline-flex min-h-11 items-center font-bold text-primary hover:text-primary-hover"
                >
                  Add property rules first (optional)
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-7 flex items-center gap-2 border-t border-border-soft pt-5 text-sm font-bold text-text-muted">
            <Info aria-hidden="true" size={18} strokeWidth={2.5} />
            You can change these details later.
          </div>
        </div>
      </div>
    </section>
  );
}

type TenantWithPipeline = Awaited<
  ReturnType<typeof getCurrentLandlordTenantsWithPipeline>
>[number];

function TenantReviewItems({ items }: { items: TenantWithPipeline[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map(({ tenant }) => (
        <article
          key={tenant.id}
          className="flex flex-col gap-4 rounded-card border border-primary/20 border-l-4 border-l-primary bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <FileCheck2 aria-hidden="true" size={20} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="font-black text-text-strong">
                Tenant details ready for review
              </p>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                {tenant.full_name} ·{" "}
                {tenant.units?.properties?.property_name ?? "Property"} ·{" "}
                {tenant.units?.unit_identifier ?? "Unit"}
              </p>
            </div>
          </div>

          <Link href={`/tenants/${tenant.id}`} className="shrink-0">
            <Button variant="secondary" fullWidth>
              Review tenant
            </Button>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: OverviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const [overview, properties, tenants] = await Promise.all([
    getCurrentLandlordRentControlOverview(
      resolvedSearchParams.property ?? null,
    ),
    getCurrentLandlordProperties(),
    getCurrentLandlordTenantsWithPipeline(),
  ]);

  const totalUnits = properties.reduce(
    (total, property) => total + property.units.length,
    0,
  );
  const setupStep: SetupStep =
    properties.length === 0 ? "property" : totalUnits === 0 ? "unit" : "tenant";
  const showSetup =
    properties.length === 0 || totalUnits === 0 || tenants.length === 0;
  const tenantReviews = tenants.filter(({ tenant }) =>
    isSubmittedForLandlordReview(tenant.onboarding_status),
  );
  const attentionCount = tenantReviews.length + overview.needsAttention.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            {showSetup
              ? `Welcome, ${overview.landlordName}`
              : "Your property today"}
          </h1>
          {showSetup ? (
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Let’s set up your property.
            </p>
          ) : null}
        </div>

        {!showSetup && overview.properties.length > 0 ? (
          <Suspense fallback={<PropertyFilterFallback />}>
            <OverviewPropertyFilter
              properties={overview.properties}
              selectedPropertyId={overview.selectedPropertyId}
              filterLabel={overview.propertyFilterLabel}
            />
          </Suspense>
        ) : null}
      </div>

      {showSetup ? (
        <NewLandlordSetup
          step={setupStep}
          firstPropertyId={properties[0]?.id ?? null}
        />
      ) : (
        <>
          <section
            aria-labelledby="property-today-heading"
            className="space-y-4"
          >
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <h1
                id="property-today-heading"
                className="text-3xl font-black tracking-tight text-text-strong"
              >
                Your property today
              </h1>

              <div className="flex items-center gap-3">
                <Suspense fallback={<PropertyFilterFallback />}>
                  <OverviewPropertyFilter
                    properties={overview.properties}
                    selectedPropertyId={overview.selectedPropertyId}
                    filterLabel={overview.propertyFilterLabel}
                  />
                </Suspense>
                <Link
                  href="/notifications"
                  aria-label="See all rent alerts"
                  className="flex size-11 items-center justify-center rounded-full border border-border-soft bg-white text-primary"
                >
                  <Bell aria-hidden="true" size={20} strokeWidth={2.6} />
                </Link>
              </div>
            </div>

            <OverviewSummaryCards
              paidCount={overview.summary.paidCount}
              owingCount={overview.summary.owingCount}
              dueSoonCount={overview.summary.dueSoonCount}
              totalOutstanding={overview.summary.totalOutstanding}
            />
          </section>

          <section
            id="needs-attention"
            aria-labelledby="attention-heading"
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <h2
                id="attention-heading"
                className="text-xl font-black text-text-strong md:text-2xl"
              >
                Needs your attention
              </h2>
              <Badge tone={attentionCount > 0 ? "danger" : "success"}>
                {attentionCount} {attentionCount === 1 ? "item" : "items"}
              </Badge>
            </div>

            {attentionCount > 0 ? (
              <div className="space-y-3">
                <TenantReviewItems items={tenantReviews} />
                <OverviewNeedsAttentionList items={overview.needsAttention} />
              </div>
            ) : (
              <div className="rounded-card border border-success/20 bg-success-soft p-5">
                <p className="font-black text-success">
                  Everything is up to date
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  No rent or tenant documents need your attention right now.
                </p>
              </div>
            )}
          </section>

          {overview.showRecentActivity ? (
            <OverviewRecentActivity events={overview.recentActivity} />
          ) : null}

          <div className="flex justify-center">
            <Link href="/tenants">
              <Button variant="secondary">
                <Users aria-hidden="true" size={17} strokeWidth={2.6} />
                View all tenants
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
