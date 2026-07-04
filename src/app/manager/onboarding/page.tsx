import { redirect } from "next/navigation";
import { ManagerOnboardingForm } from "@/components/manager/manager-onboarding-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerOnboardingPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (organization) {
    redirect("/manager/overview");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Set up your manager workspace"
        description="Create the company profile your team will use to manage landlord clients, properties, tenants, and rent records."
      />

      <TrustNotice
        title="One workspace for your property management company"
        description="After setup, you can add landlord clients, their properties, units, tenants, and rent payment records."
      />

      <ManagerOnboardingForm />
    </div>
  );
}
