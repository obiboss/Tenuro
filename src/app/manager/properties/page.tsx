import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerPropertyList } from "@/components/manager/manager-property-list";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerPropertiesPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    collection?: string;
  }>;
};

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

      return summary;
    },
    {
      total: 0,
      occupied: 0,
      vacant: 0,
    },
  );
}

export default async function ManagerPropertiesPage({
  searchParams,
}: ManagerPropertiesPageProps) {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = await searchParams;

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, units] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
  ]);

  const unitSummary = getUnitSummary(units);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            Properties
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Manage all properties, units, and tenants.
          </p>
        </div>

        <Link
          href="/manager/properties/new"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Add property
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total properties
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {properties.length.toLocaleString("en-NG")}
          </p>
        </div>

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
            Occupied units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.occupied.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Vacant units
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {unitSummary.vacant.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      <ManagerPropertyList
        landlordClients={landlordClients}
        properties={properties}
        units={units}
        searchQuery={resolvedSearchParams?.q ?? ""}
        statusFilter={resolvedSearchParams?.status ?? "all"}
        collectionFilter={resolvedSearchParams?.collection ?? "all"}
      />
    </div>
  );
}
