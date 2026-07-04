import { redirect } from "next/navigation";
import { ManagerPayoutProfileForm } from "@/components/manager/manager-payout-profile-form";
import { ManagerPayoutProfileList } from "@/components/manager/manager-payout-profile-list";
import { ManagerRemittanceForm } from "@/components/manager/manager-remittance-form";
import { ManagerRemittanceList } from "@/components/manager/manager-remittance-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  getManagerLandlordRemittanceSummaries,
  getManagerOrganizationForCurrentUser,
  listLandlordPayoutProfiles,
  listManagerLandlordClients,
  listManagerLandlordRemittances,
  listManagerRentPayments,
} from "@/server/repositories/manager.repository";
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

  const [landlordClients, payoutProfiles, rentPayments, remittances] =
    await Promise.all([
      listManagerLandlordClients(supabase, organization.id),
      listLandlordPayoutProfiles(supabase, organization.id),
      listManagerRentPayments(supabase, organization.id),
      listManagerLandlordRemittances(supabase, organization.id),
    ]);

  const summaries = getManagerLandlordRemittanceSummaries({
    landlordClients,
    payments: rentPayments,
    remittances,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Landlord remittances"
        description="Track landlord payout details and record money remitted to landlords. This does not move money automatically."
      />

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerPayoutProfileForm landlordClients={landlordClients} />
        <ManagerPayoutProfileList
          landlordClients={landlordClients}
          payoutProfiles={payoutProfiles}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerRemittanceForm
          landlordClients={landlordClients}
          payoutProfiles={payoutProfiles}
          summaries={summaries}
        />
        <ManagerRemittanceList
          landlordClients={landlordClients}
          payoutProfiles={payoutProfiles}
          remittances={remittances}
          summaries={summaries}
        />
      </section>
    </div>
  );
}
