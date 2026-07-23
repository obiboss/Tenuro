import { redirect } from "next/navigation";
import { ManagerRemittancesWorkspace } from "@/components/manager/manager-remittances-workspace";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
} from "@/server/repositories/manager.repository";
import {
  listAllManagerLandlordRemittances,
  listAllManagerMaintenanceRequests,
  listAllManagerRentPayments,
} from "@/server/services/manager-operational-data.service";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerRemittancesPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, payments, remittances, maintenance] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerProperties(supabase, organization.id),
      listAllManagerRentPayments(supabase, organization.id),
      listAllManagerLandlordRemittances(supabase, organization.id),
      listAllManagerMaintenanceRequests(supabase, organization.id),
    ]);

  return (
    <ManagerRemittancesWorkspace
      landlordClients={landlordClients}
      properties={properties}
      payments={payments}
      remittances={remittances}
      maintenance={maintenance}
    />
  );
}
