import { redirect } from "next/navigation";
import { ManagerLandlordStatementFilter } from "@/components/manager/manager-landlord-statement-filter";
import { ManagerLandlordStatementList } from "@/components/manager/manager-landlord-statement-list";
import { ManagerLandlordStatementSummary } from "@/components/manager/manager-landlord-statement-summary";
import { PageHeader } from "@/components/ui/page-header";
import {
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerLandlordRemittances,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
  type ManagerLandlordClientRow,
  type ManagerLandlordRemittanceRow,
  type ManagerRentPaymentRow,
} from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerReportsPageProps = {
  searchParams: Promise<{
    landlordClientId?: string;
  }>;
};

type StatementSummary = {
  landlordClient: ManagerLandlordClientRow;
  totalRentRecorded: number;
  managerCommission: number;
  amountDueToLandlord: number;
  amountRemitted: number;
  pendingLandlordBalance: number;
  pendingConfirmationAmount: number;
  rentPaymentCount: number;
  remittanceCount: number;
};

function isReliableRentPayment(payment: ManagerRentPaymentRow) {
  return payment.status === "recorded" || payment.status === "verified";
}

function isVisibleRentPayment(payment: ManagerRentPaymentRow) {
  return payment.status !== "rejected" && payment.status !== "reversed";
}

function isReliableRemittance(remittance: ManagerLandlordRemittanceRow) {
  return remittance.status === "recorded" || remittance.status === "confirmed";
}

function buildStatementSummary(params: {
  landlordClient: ManagerLandlordClientRow;
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
}): StatementSummary {
  const visiblePayments = params.payments.filter(isVisibleRentPayment);
  const reliablePayments = params.payments.filter(isReliableRentPayment);
  const reliableRemittances = params.remittances.filter(isReliableRemittance);

  const totalRentRecorded = visiblePayments.reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );

  const managerCommission = reliablePayments.reduce(
    (total, payment) => total + Number(payment.management_fee_amount),
    0,
  );

  const amountDueToLandlord = reliablePayments.reduce(
    (total, payment) => total + Number(payment.landlord_net_amount),
    0,
  );

  const amountRemitted = reliableRemittances.reduce(
    (total, remittance) => total + Number(remittance.amount_remitted),
    0,
  );

  const pendingConfirmationAmount = params.payments
    .filter((payment) => payment.status === "pending_confirmation")
    .reduce((total, payment) => total + Number(payment.landlord_net_amount), 0);

  return {
    landlordClient: params.landlordClient,
    totalRentRecorded,
    managerCommission,
    amountDueToLandlord,
    amountRemitted,
    pendingLandlordBalance: Math.max(0, amountDueToLandlord - amountRemitted),
    pendingConfirmationAmount,
    rentPaymentCount: params.payments.length,
    remittanceCount: params.remittances.length,
  };
}

export default async function ManagerReportsPage({
  searchParams,
}: ManagerReportsPageProps) {
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
    landlordClients,
    properties,
    units,
    tenants,
    rentPayments,
    remittances,
  ] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, { organizationId: organization.id }),
    listManagerRentPayments(supabase, organization.id),
    listManagerLandlordRemittances(supabase, organization.id),
  ]);

  const selectedLandlordClientId =
    landlordClients.find(
      (client) => client.id === resolvedSearchParams.landlordClientId,
    )?.id ??
    landlordClients[0]?.id ??
    null;

  const selectedLandlordClient =
    landlordClients.find((client) => client.id === selectedLandlordClientId) ??
    null;

  const selectedPayments = selectedLandlordClientId
    ? rentPayments.filter(
        (payment) => payment.landlord_client_id === selectedLandlordClientId,
      )
    : [];

  const selectedRemittances = selectedLandlordClientId
    ? remittances.filter(
        (remittance) =>
          remittance.landlord_client_id === selectedLandlordClientId,
      )
    : [];

  const statementSummary = selectedLandlordClient
    ? buildStatementSummary({
        landlordClient: selectedLandlordClient,
        payments: selectedPayments,
        remittances: selectedRemittances,
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landlord statement"
        description="View rent recorded, manager commission, landlord amount due, remittances, and pending balance for each landlord client."
      />

      <ManagerLandlordStatementFilter
        landlordClients={landlordClients}
        selectedLandlordClientId={selectedLandlordClientId}
      />

      {statementSummary ? (
        <>
          <ManagerLandlordStatementSummary summary={statementSummary} />

          <ManagerLandlordStatementList
            payments={selectedPayments}
            remittances={selectedRemittances}
            properties={properties}
            units={units}
            tenants={tenants}
          />
        </>
      ) : (
        <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold leading-6 text-text-muted">
            Add a landlord client before viewing landlord statements.
          </p>
        </section>
      )}
    </div>
  );
}
