import Link from "next/link";
import { redirect } from "next/navigation";
import { getManagerTenantRentStatus } from "@/lib/manager-rent-status";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { listManagerTenantAgreementDocuments } from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

type TenantDetailPageProps = { params: Promise<{ tenantId: string }> };

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { tenantId } = await params;
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(supabase, manager.id);

  if (!organization) redirect("/manager/onboarding");

  const [properties, units, tenants, payments, agreements] = await Promise.all([
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
    listManagerRentPayments(supabase, organization.id),
    listManagerTenantAgreementDocuments(supabase, { organizationId: organization.id }),
  ]);
  const tenant = tenants.find((item) => item.id === tenantId);
  if (!tenant) redirect("/manager/tenants");

  const property = properties.find((item) => item.id === tenant.property_id);
  const unit = units.find((item) => item.id === tenant.unit_id);
  const rentStatus = getManagerTenantRentStatus({ tenant, unit });
  const tenantPayments = payments
    .filter((item) => item.tenant_id === tenant.id)
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const tenantAgreements = agreements.filter(
    (item) => item.tenant_id === tenant.id && item.document_status === "accepted",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/manager/tenants" prefetch={false} className="inline-flex text-sm font-extrabold text-primary hover:underline">
        ← Back to tenants
      </Link>
      <header className="flex flex-col gap-4 rounded-card border border-border-soft bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-strong">{tenant.full_name}</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">{property?.property_name ?? "Property"} · {unit?.unit_label ?? "Unit"}</p>
        </div>
        <Link href={`/manager/tenants/${tenant.id}/download`} prefetch={false} className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft hover:bg-primary/90">
          Download tenant details (PDF)
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
            <h2 className="font-black text-text-strong">Tenant details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div><dt className="font-bold text-text-muted">Phone</dt><dd className="mt-1 font-extrabold text-text-strong">{tenant.phone_number}</dd></div>
              <div><dt className="font-bold text-text-muted">Email</dt><dd className="mt-1 font-extrabold text-text-strong">{tenant.email ?? "Not added"}</dd></div>
              <div><dt className="font-bold text-text-muted">Occupation</dt><dd className="mt-1 font-extrabold text-text-strong">{tenant.occupation ?? "Not added"}</dd></div>
              <div><dt className="font-bold text-text-muted">Status</dt><dd className="mt-1 font-extrabold text-text-strong">{tenant.status === "eviction_notice" ? "Notice served" : tenant.status}</dd></div>
            </dl>
          </section>

          <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
            <h2 className="font-black text-text-strong">Tenancy and rent</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-button bg-surface p-3"><dt className="font-bold text-text-muted">Rent</dt><dd className="mt-1 font-black text-text-strong">{formatNaira(tenant.rent_amount)}</dd></div>
              <div className="rounded-button bg-surface p-3"><dt className="font-bold text-text-muted">Next due</dt><dd className="mt-1 font-black text-text-strong">{formatDate(tenant.next_rent_due_date)}</dd></div>
              <div className="rounded-button bg-surface p-3"><dt className="font-bold text-text-muted">Balance</dt><dd className="mt-1 font-black text-text-strong">{formatNaira(tenant.current_balance)}</dd></div>
              <div className="rounded-button bg-surface p-3"><dt className="font-bold text-text-muted">Rent position</dt><dd className="mt-1 font-black text-text-strong">{rentStatus.label || "Pending"}</dd></div>
            </dl>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-bold text-text-muted">Move-in date</dt><dd className="mt-1 font-extrabold text-text-strong">{formatDate(tenant.move_in_date)}</dd></div><div><dt className="font-bold text-text-muted">Payment frequency</dt><dd className="mt-1 font-extrabold capitalize text-text-strong">{tenant.payment_frequency}</dd></div><div><dt className="font-bold text-text-muted">Tenancy period</dt><dd className="mt-1 font-extrabold text-text-strong">{formatDate(tenant.current_period_start)} – {formatDate(tenant.current_period_end)}</dd></div></dl>
          </section>

          <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
            <h2 className="font-black text-text-strong">Payment history</h2>
            {tenantPayments.length ? <ul className="mt-3 divide-y divide-border-soft">{tenantPayments.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-extrabold text-text-strong">{formatNaira(Number(payment.amount_paid))}</p><p className="text-sm font-semibold text-text-muted">{formatDate(payment.payment_date)} · {payment.status}</p></div>{payment.status === "recorded" || payment.status === "verified" ? <Link href={`/manager/receipts/${payment.id}/download`} prefetch={false} className="text-sm font-extrabold text-primary hover:underline">Download receipt →</Link> : null}</li>)}</ul> : <p className="mt-3 text-sm font-semibold text-text-muted">No payments recorded yet.</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm"><h2 className="font-black text-text-strong">Property</h2><p className="mt-3 font-extrabold text-text-strong">{property?.property_name ?? "Property"}</p><p className="mt-1 text-sm font-semibold text-text-muted">{unit?.unit_label ?? "Unit"}</p>{property ? <Link href={`/manager/properties/${property.id}`} prefetch={false} className="mt-4 inline-flex text-sm font-extrabold text-primary hover:underline">View property →</Link> : null}</section>
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm"><h2 className="font-black text-text-strong">Tenancy agreement</h2>{tenantAgreements.length ? <div className="mt-3 space-y-3">{tenantAgreements.map((agreement) => <Link key={agreement.id} href={`/manager/agreements/${agreement.id}/download`} prefetch={false} className="block text-sm font-extrabold text-primary hover:underline">View agreement →</Link>)}</div> : <p className="mt-3 text-sm font-semibold text-text-muted">No accepted agreement yet.</p>}</section>
        </aside>
      </div>
    </div>
  );
}
