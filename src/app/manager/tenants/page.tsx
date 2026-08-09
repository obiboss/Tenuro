import { redirect } from "next/navigation";
import { ManagerTenantsOfflineView } from "@/components/manager/manager-tenants-offline-view";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerTenantsPageProps = {
  searchParams?: Promise<{
    q?: string;
    rent?: string;
  }>;
};

export default async function ManagerTenantsPage({
  searchParams,
}: ManagerTenantsPageProps) {
  const resolvedSearchParams = await searchParams;

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
    <ManagerTenantsOfflineView
      initialProperties={properties}
      initialUnits={units}
      initialTenants={tenants}
      searchQuery={resolvedSearchParams?.q ?? ""}
      rentFilter={resolvedSearchParams?.rent ?? "all"}
    />
  );
}
