import { redirect } from "next/navigation";
import { ManagerTenantForm } from "@/components/manager/manager-tenant-form";
import { ManagerTenantList } from "@/components/manager/manager-tenant-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerTenantsPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Add tenants to vacant units and keep their rent balance and next due date clear."
      />

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerTenantForm properties={properties} units={units} />
        <ManagerTenantList
          properties={properties}
          units={units}
          tenants={tenants}
        />
      </section>
    </div>
  );
}
