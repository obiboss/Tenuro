import { redirect } from "next/navigation";
import { ManagerBankAccountGate } from "@/components/manager/manager-bank-account-gate";
import { ManagerOverviewCards } from "@/components/manager/manager-overview-cards";
import { getActiveManagerPaystackAccount } from "@/server/repositories/manager-paystack-accounts.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerOverviewPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [properties, units, tenants, payments, managerPaystackAccount] =
    await Promise.all([
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listManagerRentPayments(supabase, organization.id),
      getActiveManagerPaystackAccount(supabase, organization.id),
    ]);

  return (
    <div className="space-y-6">
      <ManagerBankAccountGate
        verificationStatus={managerPaystackAccount?.verification_status ?? null}
      />

      <ManagerOverviewCards
        properties={properties}
        units={units}
        tenants={tenants}
        payments={payments}
      />
    </div>
  );
}
