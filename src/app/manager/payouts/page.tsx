import { redirect } from "next/navigation";
import { ManagerLandlordPaystackAccountForm } from "@/components/manager/manager-landlord-paystack-account-form";
import { ManagerPaystackAccountForm } from "@/components/manager/manager-paystack-account-form";
import { ManagerPaystackAccountList } from "@/components/manager/manager-paystack-account-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  listManagerLandlordPaystackAccounts,
  listManagerPaystackAccounts,
} from "@/server/repositories/manager-paystack-accounts.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
} from "@/server/repositories/manager.repository";
import { requireManagerWorkspaceOperator } from "@/server/services/auth.service";
import { getPaystackBanksForManagerSetup } from "@/server/services/manager-bank.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerPayoutsPage() {
  const manager = await requireManagerWorkspaceOperator();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, managerAccounts, landlordAccounts, banks] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerPaystackAccounts(supabase, organization.id),
      listManagerLandlordPaystackAccounts(supabase, organization.id),
      getPaystackBanksForManagerSetup(),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payout setup"
        description="Set where online rent payments should go. BOPA uses this setup when creating secure payment links."
      />

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerPaystackAccountForm
          banks={banks}
          defaultBusinessName={organization.organization_name}
        />

        <ManagerPaystackAccountList
          landlordClients={landlordClients}
          managerAccounts={managerAccounts}
          landlordAccounts={landlordAccounts}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerLandlordPaystackAccountForm landlordClients={landlordClients} />

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            How BOPA uses this
          </h2>

          <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-text-muted">
            <p>
              For the current BOPA Manager flow, tenant rent paid through
              Paystack settles into the verified manager payout account.
            </p>

            <p>
              BOPA records the rent paid, manager commission, landlord share,
              Paystack charge, platform fee, and remittance balance
              automatically.
            </p>

            <p>
              Landlord-direct payout and automatic split payout are not active
              in this first manager version.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
