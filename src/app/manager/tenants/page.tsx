import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerTenantList } from "@/components/manager/manager-tenant-list";
import { getManagerTenantRentStatus } from "@/lib/manager-rent-status";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import {
  listManagerTenantAgreementDocuments,
  listManagerTenantOnboardingRequests,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createExistingTenantPaymentEvidenceLink } from "@/server/services/storage.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerTenantsPageProps = {
  searchParams?: Promise<{
    q?: string;
    rent?: string;
  }>;
};

function getTenantSummary(params: {
  tenants: Awaited<ReturnType<typeof listManagerTenants>>;
  units: Awaited<ReturnType<typeof listManagerUnits>>;
}) {
  const unitById = new Map(params.units.map((unit) => [unit.id, unit]));

  return params.tenants.reduce(
    (summary, tenant) => {
      const rentStatus = getManagerTenantRentStatus({
        tenant,
        unit: unitById.get(tenant.unit_id),
      });

      summary.current += 1;

      if (rentStatus.kind === "owing") {
        summary.owing += 1;
      }

      if (rentStatus.kind === "due_soon") {
        summary.dueSoon += 1;
      }

      if (tenant.status === "eviction_notice") {
        summary.noticeServed += 1;
      }

      return summary;
    },
    {
      current: 0,
      owing: 0,
      dueSoon: 0,
      noticeServed: 0,
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

  const [
    properties,
    units,
    tenants,
    payments,
    agreementDocuments,
    onboardingRequests,
  ] =
    await Promise.all([
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listManagerRentPayments(supabase, organization.id),
      listManagerTenantAgreementDocuments(supabase, {
        organizationId: organization.id,
      }),
      listManagerTenantOnboardingRequests(supabase, {
        organizationId: organization.id,
      }),
    ]);
  const existingTenantEvidence = await Promise.all(
    onboardingRequests
      .filter(
        (request) =>
          request.onboarding_type === "current_occupant" &&
          Boolean(request.approved_tenant_id) &&
          Boolean(request.existing_tenant_last_payment_receipt_path),
      )
      .map(async (request) => ({
        tenantId: request.approved_tenant_id ?? "",
        amount: request.existing_tenant_last_payment_amount,
        paymentDate: request.existing_tenant_last_payment_date,
        receipt: await createExistingTenantPaymentEvidenceLink({
          path: request.existing_tenant_last_payment_receipt_path,
          fileName: request.existing_tenant_last_payment_receipt_file_name,
        }),
      })),
  );

  const tenantSummary = getTenantSummary({ tenants, units });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">
            Tenants
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Monitor rent positions, balances, due dates, and occupied units.
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
            Current tenants
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenantSummary.current.toLocaleString("en-NG")}
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

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Notice served
          </p>
          <p className="mt-2 text-2xl font-black text-text-strong">
            {tenantSummary.noticeServed.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      <ManagerTenantList
        properties={properties}
        units={units}
        tenants={tenants}
        payments={payments}
        agreementDocuments={agreementDocuments}
        existingTenantEvidence={existingTenantEvidence}
        searchQuery={resolvedSearchParams?.q ?? ""}
        rentFilter={resolvedSearchParams?.rent ?? "all"}
      />
    </div>
  );
}
