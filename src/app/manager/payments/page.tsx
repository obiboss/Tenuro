import { redirect } from "next/navigation";
import { ManagerPaymentForm } from "@/components/manager/manager-payment-form";
import { ManagerPaymentList } from "@/components/manager/manager-payment-list";
import { ManagerPaystackPaymentLinkForm } from "@/components/manager/manager-paystack-payment-link-form";
import { ManagerPaystackPaymentLinkList } from "@/components/manager/manager-paystack-payment-link-list";
import { PageHeader } from "@/components/ui/page-header";
import { listManagerPaystackPaymentRequests } from "@/server/repositories/manager-paystack.repository";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerPaymentsPage() {
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
    landlordClients,
    properties,
    units,
    tenants,
    payments,
    paystackPaymentRequests,
  ] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
    listManagerRentPayments(supabase, organization.id),
    listManagerPaystackPaymentRequests(supabase, organization.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rent payments"
        description="Record manual rent payments or create Paystack links. BOPA calculates the split automatically."
      />

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerPaystackPaymentLinkForm
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
        />

        <ManagerPaystackPaymentLinkList
          properties={properties}
          units={units}
          tenants={tenants}
          paymentRequests={paystackPaymentRequests}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerPaymentForm
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
        />

        <ManagerPaymentList
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
          payments={payments}
        />
      </section>
    </div>
  );
}
