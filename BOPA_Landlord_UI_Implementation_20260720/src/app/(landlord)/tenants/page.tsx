import Link from "next/link";
import { UserRoundCheck, Users } from "lucide-react";
import { TenantCard } from "@/components/tenant/tenant-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordTenantsWithPipeline } from "@/server/services/tenants.service";

function TenantPageActions({
  layout = "header",
}: {
  layout?: "header" | "empty";
}) {
  const isEmpty = layout === "empty";

  return (
    <div
      className={
        isEmpty
          ? "flex w-full flex-col gap-2"
          : "grid w-full gap-2 sm:w-auto sm:min-w-70"
      }
    >
      <Link href="/tenants/new" className="block">
        <Button fullWidth>Add a tenant</Button>
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/existing-tenant-claims" className="block">
          <Button variant="secondary" fullWidth size="sm">
            Details to review
          </Button>
        </Link>

        <Link href="/tenants/existing/new" className="block">
          <Button variant="secondary" fullWidth size="sm">
            {isEmpty ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRoundCheck
                  aria-hidden="true"
                  size={15}
                  strokeWidth={2.6}
                />
                Invite existing
              </span>
            ) : (
              "Invite existing"
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default async function TenantsPage() {
  const tenants = await getCurrentLandlordTenantsWithPipeline();

  return (
    <div>
      <PageHeader
        compact
        title="My tenants"
        description="See every tenant and what needs to happen next."
        action={<TenantPageActions />}
      />

      {tenants.length === 0 ? (
        <EmptyState
          title="No tenant added yet"
          description="Add someone moving in or a tenant already living in your property."
          icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
          action={<TenantPageActions layout="empty" />}
        />
      ) : (
        <div className="grid gap-3">
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
