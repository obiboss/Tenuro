import { redirect } from "next/navigation";
import { ManagerLandlordsWorkspace } from "@/components/manager/manager-landlords-workspace";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import {
  listAllManagerLandlordRemittances,
  listAllManagerMaintenanceRequests,
  listAllManagerRentPayments,
} from "@/server/services/manager-operational-data.service";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerLandlordsPage() {
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
    landlordClients,
    properties,
    units,
    tenants,
    payments,
    remittances,
    maintenance,
  ] = await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listAllManagerRentPayments(supabase, organization.id),
      listAllManagerLandlordRemittances(supabase, organization.id),
      listAllManagerMaintenanceRequests(supabase, organization.id),
    ]);

  return (
    <ManagerLandlordsWorkspace
      landlordClients={landlordClients}
      properties={properties}
      units={units}
      tenants={tenants}
      payments={payments}
      remittances={remittances}
      maintenance={maintenance}
    />
  );
}
