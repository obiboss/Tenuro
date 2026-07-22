import { redirect } from "next/navigation";
import { ManagerPropertiesOfflineView } from "@/components/manager/manager-properties-offline-view";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerPropertiesPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    collection?: string;
  }>;
};

export default async function ManagerPropertiesPage({
  searchParams,
}: ManagerPropertiesPageProps) {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = await searchParams;

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, units, tenants] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
  ]);


  return (
    <ManagerPropertiesOfflineView
      initialLandlordClients={landlordClients}
      initialProperties={properties}
      initialUnits={units}
      initialTenants={tenants}
      searchQuery={resolvedSearchParams?.q ?? ""}
      statusFilter={resolvedSearchParams?.status ?? "all"}
      collectionFilter={resolvedSearchParams?.collection ?? "all"}
    />
  );
}
