import { redirect } from "next/navigation";
import { ManagerPaymentsOfflineView } from "@/components/manager/manager-payments-offline-view";
import { listManagerPaystackPaymentRequests } from "@/server/repositories/manager-paystack.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManagerWorkspaceOperator } from "@/server/services/auth.service";
import { listAllManagerRentPayments } from "@/server/services/manager-operational-data.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerPaymentsPage() {
  const manager = await requireManagerWorkspaceOperator();
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
    paystackPaymentRequests,
  ] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
    listAllManagerRentPayments(supabase, organization.id),
    listManagerPaystackPaymentRequests(supabase, organization.id),
  ]);

  return (
    <ManagerPaymentsOfflineView
      initialLandlordClients={landlordClients}
      initialProperties={properties}
      initialUnits={units}
      initialTenants={tenants}
      initialPayments={payments}
      paystackPaymentRequests={paystackPaymentRequests}
    />
  );
}
