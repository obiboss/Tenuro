import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ManagerTenantOnboardingForm } from "@/components/manager/manager-tenant-onboarding-form";
import { ManagerTenantOnboardingReviewList } from "@/components/manager/manager-tenant-onboarding-review-list";
import { ManagerUnitForm } from "@/components/manager/manager-unit-form";
import { ManagerUnitList } from "@/components/manager/manager-unit-list";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { listManagerTenantOnboardingRequests } from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerPropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    addUnit?: string;
    onboardUnit?: string;
  }>;
};

function formatFee(params: {
  management_fee_type: "percentage" | "flat";
  management_fee_value: number;
}) {
  const value = Number(params.management_fee_value);

  if (!Number.isFinite(value) || value <= 0) {
    return "No fee";
  }

  if (params.management_fee_type === "percentage") {
    return `${value.toLocaleString("en-NG")}%`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCollectionSummary(collectionMode: string) {
  if (collectionMode === "manager_collects") {
    return "Manager collects";
  }

  if (collectionMode === "landlord_direct") {
    return "Landlord direct";
  }

  return "BOPA automatic split";
}

function getUnitSummary(units: Awaited<ReturnType<typeof listManagerUnits>>) {
  return units.reduce(
    (summary, unit) => {
      summary.total += 1;

      if (unit.status === "occupied") {
        summary.occupied += 1;
      }

      if (unit.status === "vacant") {
        summary.vacant += 1;
      }

      if (unit.status === "reserved") {
        summary.reserved += 1;
      }

      return summary;
    },
    {
      total: 0,
      occupied: 0,
      vacant: 0,
      reserved: 0,
    },
  );
}

export default async function ManagerPropertyDetailPage({
  params,
  searchParams,
}: ManagerPropertyDetailPageProps) {
  const { propertyId } = await params;
  const resolvedSearchParams = await searchParams;

  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, units, tenants, onboardingRequests] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listManagerTenantOnboardingRequests(supabase, {
        organizationId: organization.id,
        propertyId,
      }),
    ]);

  const property = properties.find((item) => item.id === propertyId);

  if (!property) {
    notFound();
  }

  const landlord = landlordClients.find(
    (client) => client.id === property.landlord_client_id,
  );

  const propertyUnits = units.filter(
    (unit) => unit.property_id === property.id,
  );

  const propertyTenants = tenants.filter(
    (tenant) => tenant.property_id === property.id,
  );

  const unitSummary = getUnitSummary(propertyUnits);

  const selectedVacantUnit = propertyUnits.find(
    (unit) =>
      unit.id === resolvedSearchParams?.onboardUnit && unit.status === "vacant",
  );

  const showAddUnitForm =
    resolvedSearchParams?.addUnit === "1" || propertyUnits.length === 0;

  const location = [property.city, property.lga, property.state]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/manager/properties"
        prefetch={false}
        className="inline-flex text-sm font-black text-primary"
      >
        ← Back to properties
      </Link>

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-black tracking-tight text-text-strong">
                {property.property_name}
              </h1>

              <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
                {property.status}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
              {property.property_address}
            </p>

            {location ? (
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                {location}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/manager/properties/${property.id}?addUnit=1#add-unit`}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              Add unit
            </Link>

            <Link
              href="/manager/properties"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
            >
              All properties
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Landlord
            </p>
            <p className="mt-1 truncate text-sm font-black text-text-strong">
              {landlord?.landlord_name ?? "Landlord"}
            </p>
          </div>

          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Rent collection
            </p>
            <p className="mt-1 text-sm font-black text-text-strong">
              {getCollectionSummary(property.collection_mode)}
            </p>
          </div>

          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Management fee
            </p>
            <p className="mt-1 text-sm font-black text-text-strong">
              {formatFee(property)}
            </p>
          </div>

          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Units
            </p>
            <p className="mt-1 text-sm font-black text-text-strong">
              {unitSummary.total.toLocaleString("en-NG")}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.total.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Occupied
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.occupied.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Vacant
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.vacant.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Reserved
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.reserved.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      {selectedVacantUnit ? (
        <section id="tenant-onboarding" className="scroll-mt-24">
          <ManagerTenantOnboardingForm
            property={property}
            unit={selectedVacantUnit}
          />
        </section>
      ) : null}

      <ManagerTenantOnboardingReviewList requests={onboardingRequests} />

      <ManagerUnitList
        properties={[property]}
        units={propertyUnits}
        tenants={propertyTenants}
        showTenantActions
      />

      {showAddUnitForm ? (
        <section id="add-unit" className="scroll-mt-24">
          <ManagerUnitForm
            properties={[property]}
            lockedPropertyId={property.id}
          />
        </section>
      ) : null}
    </div>
  );
}
