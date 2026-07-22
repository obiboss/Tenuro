import { redirect } from "next/navigation";
import { ManagerTenantsOfflineView } from "@/components/manager/manager-tenants-offline-view";
import {
  getManagerOrganizationForCurrentUser,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import {
  listManagerTenantAgreementDocuments,
  listManagerTenantOnboardingRequests,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createExistingTenantPaymentEvidenceLink } from "@/server/services/storage.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerTenantsPageProps = {
  searchParams?: Promise<{
    q?: string;
    rent?: string;
  }>;
};

export default async function ManagerTenantsPage({
  searchParams,
}: ManagerTenantsPageProps) {
  const resolvedSearchParams = await searchParams;

  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [
    properties,
    units,
    tenants,
    payments,
    agreementDocuments,
    onboardingRequests,
  ] =
    await Promise.all([
      listManagerProperties(supabase, organization.id),
      listManagerUnits(supabase, { organizationId: organization.id }),
      listManagerTenants(supabase, { organizationId: organization.id }),
      listManagerRentPayments(supabase, organization.id),
      listManagerTenantAgreementDocuments(supabase, {
        organizationId: organization.id,
      }),
      listManagerTenantOnboardingRequests(supabase, {
        organizationId: organization.id,
      }),
    ]);
  const existingTenantEvidence = await Promise.all(
    onboardingRequests
      .filter(
        (request) =>
          request.onboarding_type === "current_occupant" &&
          Boolean(request.approved_tenant_id) &&
          Boolean(request.existing_tenant_last_payment_receipt_path),
      )
      .map(async (request) => ({
        tenantId: request.approved_tenant_id ?? "",
        amount: request.existing_tenant_last_payment_amount,
        paymentDate: request.existing_tenant_last_payment_date,
        receipt: await createExistingTenantPaymentEvidenceLink({
          path: request.existing_tenant_last_payment_receipt_path,
          fileName: request.existing_tenant_last_payment_receipt_file_name,
        }),
      })),
  );


  return (
    <ManagerTenantsOfflineView
      initialProperties={properties}
      initialUnits={units}
      initialTenants={tenants}
      initialPayments={payments}
      agreementDocuments={agreementDocuments}
      existingTenantEvidence={existingTenantEvidence}
      searchQuery={resolvedSearchParams?.q ?? ""}
      rentFilter={resolvedSearchParams?.rent ?? "all"}
    />
  );
}
