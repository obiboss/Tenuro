import Link from "next/link";
import { FileCheck2, Users } from "lucide-react";
import { TenantCard } from "@/components/tenant/tenant-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordExistingTenantClaims } from "@/server/services/existing-tenant-claims.service";
import { getCurrentLandlordTenantsWithPipeline } from "@/server/services/tenants.service";

function TenantPageActions() {
  return (
    <div className="w-full sm:w-auto sm:min-w-52">
      <Link href="/tenants/new" className="block">
        <Button fullWidth>Add a tenant</Button>
      </Link>
    </div>
  );
}

function getClaimTenantName(
  claim: Awaited<ReturnType<typeof getCurrentLandlordExistingTenantClaims>>[number],
) {
  return claim.tenant_full_name ?? claim.invited_tenant_full_name ?? "Tenant";
}

function SubmittedTenantReviewCards({
  claims,
}: {
  claims: Awaited<ReturnType<typeof getCurrentLandlordExistingTenantClaims>>;
}) {
  const submittedClaims = claims.filter((claim) => claim.status === "submitted");

  if (submittedClaims.length === 0) {
    return null;
  }

  if (submittedClaims.length >= 3) {
    return (
      <Link
        href="/existing-tenant-claims?filter=submitted"
        className="flex items-center justify-between gap-4 rounded-card border border-warning/20 border-l-4 border-l-warning bg-warning-soft p-4 text-text-strong transition hover:bg-warning-soft/70"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-warning">
            <FileCheck2 aria-hidden="true" size={20} strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-black">{submittedClaims.length} tenants awaiting review</p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Submitted information is ready for you to check.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-black text-warning">View all</span>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {submittedClaims.map((claim) => (
        <article
          key={claim.id}
          className="flex flex-col gap-4 rounded-card border border-warning/20 border-l-4 border-l-warning bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-warning">
              <FileCheck2 aria-hidden="true" size={20} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-black text-text-strong">
                {getClaimTenantName(claim)}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Submitted info for review
              </p>
            </div>
          </div>
          <Link
            href={`/existing-tenant-claims/${claim.id}`}
            className="shrink-0"
          >
            <Button variant="secondary" fullWidth>
              Review
            </Button>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function TenantsPage() {
  const [tenants, existingTenantClaims] = await Promise.all([
    getCurrentLandlordTenantsWithPipeline(),
    getCurrentLandlordExistingTenantClaims(),
  ]);
  const hasSubmittedTenantReviews = existingTenantClaims.some(
    (claim) => claim.status === "submitted",
  );

  return (
    <div>
      <PageHeader
        compact
        title="My tenants"
        description="See every tenant and what needs to happen next."
        action={<TenantPageActions />}
      />

      {tenants.length === 0 && !hasSubmittedTenantReviews ? (
        <EmptyState
          title="No tenant added yet"
          description="Add someone moving in or a tenant already living in your property."
          icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
          action={<TenantPageActions />}
        />
      ) : (
        <div className="grid gap-3">
          <SubmittedTenantReviewCards claims={existingTenantClaims} />
          {tenants.map(({ tenant, pipelineStatus }) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              pipelineStatus={pipelineStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
