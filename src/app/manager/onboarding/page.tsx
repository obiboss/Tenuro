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
        title="What is your business name?"
        description="This name will appear on your manager workspace, receipts, and landlord statements."
      />

      <TrustNotice
        title="One simple workspace"
        description="After this, start by adding a landlord, then add the property, units, and tenants."
      />

      <ManagerOnboardingForm />
    </div>
  );
}
