import { redirect } from "next/navigation";
import { ManagerBankAccountGate } from "@/components/manager/manager-bank-account-gate";
import { ManagerOperationalOverviewOffline } from "@/components/manager/manager-operational-overview-offline";
import { getActiveManagerPaystackAccount } from "@/server/repositories/manager-paystack-accounts.repository";
import {
  getManagerOverview,
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManagerWorkspaceOperator } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerOverviewPage() {
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
    overview,
    managerPaystackAccount,
    landlordClients,
    properties,
    units,
    tenants,
    payments,
  ] = await Promise.all([
    getManagerOverview(supabase, organization.id),
    getActiveManagerPaystackAccount(supabase, organization.id),
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
    listManagerRentPayments(supabase, organization.id),
  ]);

  if (!overview) {
    redirect("/manager/onboarding");
  }

  return (
    <div className="space-y-4">
      <ManagerBankAccountGate
        verificationStatus={managerPaystackAccount?.verification_status ?? null}
      />

      <ManagerOperationalOverviewOffline
        managerName={manager.fullName}
        overview={overview}
        initialLandlordClients={landlordClients}
        initialProperties={properties}
        initialUnits={units}
        initialTenants={tenants}
        initialPayments={payments}
      />
    </div>
  );
}
