import { redirect } from "next/navigation";
import { ManagerLandlordForm } from "@/components/manager/manager-landlord-form";
import { ManagerLandlordList } from "@/components/manager/manager-landlord-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerLandlordsPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const landlordClients = await listManagerLandlordClients(
    supabase,
    organization.id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landlord clients"
        description="Add and manage the landlords your company manages properties for."
      />

      <section
        id="add-landlord"
        className="grid gap-6 lg:grid-cols-[420px_1fr]"
      >
        <ManagerLandlordForm />
        <ManagerLandlordList landlordClients={landlordClients} />
      </section>
    </div>
  );
}
