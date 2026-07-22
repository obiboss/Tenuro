import { redirect } from "next/navigation";
import { ManagerMaintenanceOfflineView } from "@/components/manager/manager-maintenance-offline-view";
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

type ManagerMaintenancePageProps = {
  searchParams?: Promise<{
    propertyId?: string;
  }>;
};

export default async function ManagerMaintenancePage({
  searchParams,
}: ManagerMaintenancePageProps) {
  const resolvedSearchParams = await searchParams;
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization =
    await getManagerOrganizationForCurrentUser(
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
    maintenanceRequests,
  ] = await Promise.all([
    listManagerLandlordClients(
      supabase,
      organization.id,
    ),
    listManagerProperties(
      supabase,
      organization.id,
    ),
    listManagerUnits(supabase, {
      organizationId: organization.id,
    }),
    listManagerTenants(supabase, {
      organizationId: organization.id,
    }),
    listManagerMaintenanceRequests(
      supabase,
      organization.id,
    ),
  ]);

  const selectedPropertyId =
    properties.find(
      (property) =>
        property.id === resolvedSearchParams?.propertyId,
    )?.id ?? "";



  return (
    <ManagerMaintenanceOfflineView
      initialLandlordClients={landlordClients}
      initialProperties={properties}
      initialUnits={units}
      initialTenants={tenants}
      initialMaintenanceRequests={maintenanceRequests}
      selectedPropertyId={selectedPropertyId}
    />
  );
}
