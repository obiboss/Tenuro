import Link from "next/link";
import { UserRoundCheck, Users } from "lucide-react";
import { TenantCard } from "@/components/tenant/tenant-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordTenantsWithPipeline } from "@/server/services/tenants.service";

export default async function TenantsPage() {
  const tenants = await getCurrentLandlordTenantsWithPipeline();

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Keep tenant records, rental units, profile status, and payment history organised."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/existing-tenant-claims">
              <Button variant="secondary">Review Existing Claims</Button>
            </Link>

            <Link href="/tenants/existing/new">
              <Button variant="secondary">Invite Existing Tenant</Button>
            </Link>

            <Link href="/tenants/new">
              <Button>Add Tenant</Button>
            </Link>
          </div>
        }
      />

      {tenants.length === 0 ? (
        <EmptyState
          title="No tenant added yet"
          description="Add a new tenant or invite an existing tenant to confirm their tenancy details."
          icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/existing-tenant-claims">
                <Button variant="secondary">Review Existing Claims</Button>
              </Link>

              <Link href="/tenants/existing/new">
                <Button variant="secondary">
                  <span className="inline-flex items-center gap-2">
                    <UserRoundCheck
                      aria-hidden="true"
                      size={18}
                      strokeWidth={2.6}
                    />
                    Invite Existing Tenant
                  </span>
                </Button>
              </Link>

              <Link href="/tenants/new">
                <Button>Add Tenant</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5">
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
