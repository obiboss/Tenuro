import Link from "next/link";
import { Users } from "lucide-react";
import { TenantCard } from "@/components/tenant/tenant-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordTenants } from "@/server/services/tenants.service";

export default async function TenantsPage() {
  const tenants = await getCurrentLandlordTenants();

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Keep tenant records, rental units, profile status, and payment history organised."
        action={
          <Link href="/tenants/new">
            <Button>Add Tenant</Button>
          </Link>
        }
      />

      {tenants.length === 0 ? (
        <EmptyState
          title="No tenant added yet"
          description="Add your first tenant and assign them to a vacant unit."
          icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
          action={
            <Link href="/tenants/new">
              <Button>Add Tenant</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5">
          {tenants.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} />
          ))}
        </div>
      )}
    </div>
  );
}
