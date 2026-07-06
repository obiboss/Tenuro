import { redirect } from "next/navigation";
import { ManagerMaintenanceForm } from "@/components/manager/manager-maintenance-form";
import { ManagerMaintenanceList } from "@/components/manager/manager-maintenance-list";
import { PageHeader } from "@/components/ui/page-header";
import { listManagerMaintenanceRequests } from "@/server/repositories/manager-maintenance.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerMaintenancePage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, units, tenants, maintenanceRequests] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listManagerMaintenanceRequests(supabase, organization.id),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Record repairs, track costs, and see open maintenance issues across managed properties."
      />

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerMaintenanceForm
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
        />

        <ManagerMaintenanceList
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
          maintenanceRequests={maintenanceRequests}
        />
      </section>
    </div>
  );
}
