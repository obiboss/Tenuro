import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerTenantList } from "@/components/manager/manager-tenant-list";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerTenantsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    rent?: string;
  }>;
};

function getDaysFromToday(date: string | null) {
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${date}T00:00:00`);
  const difference = dueDate.getTime() - today.getTime();

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getTenantSummary(
  tenants: Awaited<ReturnType<typeof listManagerTenants>>,
) {
  return tenants.reduce(
    (summary, tenant) => {
      if (tenant.status === "active") {
        summary.active += 1;
      }

      if (Number(tenant.current_balance) > 0) {
        summary.owing += 1;
      }

      const daysFromToday = getDaysFromToday(tenant.next_rent_due_date);

      if (
        tenant.status === "active" &&
        daysFromToday !== null &&
        daysFromToday >= 0 &&
        daysFromToday <= 30
      ) {
        summary.dueSoon += 1;
      }

      return summary;
    },
    {
      active: 0,
      owing: 0,
      dueSoon: 0,
    },
  );
}

export default async function ManagerTenantsPage({
  searchParams,
}: ManagerTenantsPageProps) {
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

  const [properties, units, tenants] = await Promise.all([
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
  ]);

  const tenantSummary = getTenantSummary(tenants);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            Tenants
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Monitor rent status, balances, due dates, and occupied units.
          </p>
        </div>

        <Link
          href="/manager/properties"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Add tenant from property
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Total tenants
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenants.length.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Active tenants
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenantSummary.active.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Owing
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenantSummary.owing.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Due soon
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenantSummary.dueSoon.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      <ManagerTenantList
        properties={properties}
        units={units}
        tenants={tenants}
        searchQuery={resolvedSearchParams?.q ?? ""}
        statusFilter={resolvedSearchParams?.status ?? "all"}
        rentFilter={resolvedSearchParams?.rent ?? "all"}
      />
    </div>
  );
}
