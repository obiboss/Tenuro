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
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerPayoutsPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, managerAccounts, landlordAccounts] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listManagerPaystackAccounts(supabase, organization.id),
      listManagerLandlordPaystackAccounts(supabase, organization.id),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payout setup"
        description="Set where online rent payments should go. BOPA uses this setup when creating secure payment links."
      />

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerPaystackAccountForm
          organizationName={organization.organization_name}
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
              For automatic split, BOPA pays the landlord share to the landlord
              account and the management fee to the manager account.
            </p>
            <p>
              For manager collects, online rent goes to the manager account and
              BOPA tracks the amount due to the landlord.
            </p>
            <p>
              For landlord direct, online rent goes to the landlord account and
              BOPA keeps the records clear.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
