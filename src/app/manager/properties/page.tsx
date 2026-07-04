import { redirect } from "next/navigation";
import { ManagerPropertyForm } from "@/components/manager/manager-property-form";
import { ManagerPropertyList } from "@/components/manager/manager-property-list";
import { ManagerUnitForm } from "@/components/manager/manager-unit-form";
import { ManagerUnitList } from "@/components/manager/manager-unit-list";
import { PageHeader } from "@/components/ui/page-header";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerPropertiesPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [landlordClients, properties, units] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Properties and units"
        description="Add properties under landlord clients, set how rent is collected, and create units for each property."
      />

      <section
        id="add-property"
        className="grid gap-6 lg:grid-cols-[440px_1fr]"
      >
        <ManagerPropertyForm landlordClients={landlordClients} />
        <ManagerPropertyList
          landlordClients={landlordClients}
          properties={properties}
        />
      </section>

      <section id="add-unit" className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <ManagerUnitForm properties={properties} />
        <ManagerUnitList properties={properties} units={units} />
      </section>
    </div>
  );
}
