import { redirect } from "next/navigation";
import { ManagerBankAccountGate } from "@/components/manager/manager-bank-account-gate";
import { ManagerOperationalOverview } from "@/components/manager/manager-operational-overview";
import { getActiveManagerPaystackAccount } from "@/server/repositories/manager-paystack-accounts.repository";
import {
  getManagerOverview,
  getManagerOrganizationForCurrentUser,
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

  const [overview, managerPaystackAccount] = await Promise.all([
    getManagerOverview(supabase, organization.id),
    getActiveManagerPaystackAccount(supabase, organization.id),
  ]);

  if (!overview) {
    redirect("/manager/onboarding");
  }

  return (
    <div className="space-y-4">
      <ManagerBankAccountGate
        verificationStatus={managerPaystackAccount?.verification_status ?? null}
      />

      <ManagerOperationalOverview
        managerName={manager.fullName}
        overview={overview}
      />
    </div>
  );
}
