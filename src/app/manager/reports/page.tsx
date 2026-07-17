import { redirect } from "next/navigation";
import { ManagerLandlordStatementList } from "@/components/manager/manager-landlord-statement-list";
import { ManagerLandlordStatementSummary } from "@/components/manager/manager-landlord-statement-summary";
import { ManagerPropertyReportActions } from "@/components/manager/manager-property-report-actions";
import { ManagerReportDocumentHistory } from "@/components/manager/manager-report-document-history";
import { ManagerStatementDocumentActions } from "@/components/manager/manager-statement-document-actions";
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
import { listManagerStatementDocuments } from "@/server/repositories/manager-statement-documents.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type Props = {
  searchParams: Promise<{
    landlordClientId?: string;
    dateFrom?: string;
    dateTo?: string;
    propertyId?: string;
    propertyDateFrom?: string;
    propertyDateTo?: string;
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

function normalizeDate(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? trimmed
    : null;
}

function isReliableRentPayment(payment: ManagerRentPaymentRow) {
  return (
    payment.status === "recorded" ||
    payment.status === "verified"
  );
}

function isVisibleRentPayment(payment: ManagerRentPaymentRow) {
  return (
    payment.status !== "rejected" &&
    payment.status !== "reversed"
  );
}

function isReliableRemittance(
  remittance: ManagerLandlordRemittanceRow,
) {
  return (
    remittance.status === "recorded" ||
    remittance.status === "confirmed"
  );
}

function isWithinDateRange(params: {
  value: string;
  dateFrom: string | null;
  dateTo: string | null;
}) {
  if (params.dateFrom && params.value < params.dateFrom) {
    return false;
  }

  if (params.dateTo && params.value > params.dateTo) {
    return false;
  }

  return true;
}

function buildStatementSummary(params: {
  landlordClient: ManagerLandlordClientRow;
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
}): StatementSummary {
  const visiblePayments = params.payments.filter(
    isVisibleRentPayment,
  );
  const reliablePayments = params.payments.filter(
    isReliableRentPayment,
  );
  const reliableRemittances = params.remittances.filter(
    isReliableRemittance,
  );

  const totalRentRecorded = visiblePayments.reduce(
    (total, payment) =>
      total + Number(payment.amount_paid),
    0,
  );
  const managerCommission = reliablePayments.reduce(
    (total, payment) =>
      total + Number(payment.management_fee_amount),
    0,
  );
  const amountDueToLandlord = reliablePayments.reduce(
    (total, payment) =>
      total + Number(payment.landlord_net_amount),
    0,
  );
  const amountRemitted = reliableRemittances.reduce(
    (total, remittance) =>
      total + Number(remittance.amount_remitted),
    0,
  );
  const pendingConfirmationAmount = params.payments
    .filter(
      (payment) =>
        payment.status === "pending_confirmation",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.landlord_net_amount),
      0,
    );

  return {
    landlordClient: params.landlordClient,
    totalRentRecorded,
    managerCommission,
    amountDueToLandlord,
    amountRemitted,
    pendingLandlordBalance: Math.max(
      0,
      amountDueToLandlord - amountRemitted,
    ),
    pendingConfirmationAmount,
    rentPaymentCount: params.payments.length,
    remittanceCount: params.remittances.length,
  };
}

export default async function ManagerReportsPage({
  searchParams,
}: Props) {
  const resolvedSearchParams = await searchParams;
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization =
    await getManagerOrganizationForCurrentUser(
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
    generatedDocuments,
  ] = await Promise.all([
    listManagerLandlordClients(
      supabase,
      organization.id,
    ),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, {
      organizationId: organization.id,
    }),
    listManagerTenants(supabase, {
      organizationId: organization.id,
    }),
    listManagerRentPayments(
      supabase,
      organization.id,
    ),
    listManagerLandlordRemittances(
      supabase,
      organization.id,
    ),
    listManagerStatementDocuments(supabase, {
      organizationId: organization.id,
      limit: 20,
    }),
  ]);

  const activeLandlords = landlordClients.filter(
    (client) => client.status === "active",
  );
  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );

  const selectedLandlordClientId =
    activeLandlords.find(
      (client) =>
        client.id ===
        resolvedSearchParams.landlordClientId,
    )?.id ??
    activeLandlords[0]?.id ??
    null;

  const selectedPropertyId =
    activeProperties.find(
      (property) =>
        property.id === resolvedSearchParams.propertyId,
    )?.id ??
    activeProperties[0]?.id ??
    null;

  const dateFrom = normalizeDate(
    resolvedSearchParams.dateFrom,
  );
  const dateTo = normalizeDate(
    resolvedSearchParams.dateTo,
  );
  const propertyDateFrom = normalizeDate(
    resolvedSearchParams.propertyDateFrom,
  );
  const propertyDateTo = normalizeDate(
    resolvedSearchParams.propertyDateTo,
  );

  const selectedLandlordClient =
    landlordClients.find(
      (client) =>
        client.id === selectedLandlordClientId,
    ) ?? null;

  const selectedPayments = selectedLandlordClientId
    ? rentPayments.filter(
        (payment) =>
          payment.landlord_client_id ===
            selectedLandlordClientId &&
          isWithinDateRange({
            value: payment.payment_date,
            dateFrom,
            dateTo,
          }),
      )
    : [];

  const selectedRemittances = selectedLandlordClientId
    ? remittances.filter(
        (remittance) =>
          remittance.landlord_client_id ===
            selectedLandlordClientId &&
          isWithinDateRange({
            value: remittance.remittance_date,
            dateFrom,
            dateTo,
          }),
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
        title="Reports"
        description="Prepare clear landlord and property records from saved rent, remittance, tenant, and maintenance information."
      />

      <ManagerPropertyReportActions
        landlordClients={landlordClients}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        dateFrom={propertyDateFrom}
        dateTo={propertyDateTo}
      />

      <ManagerStatementDocumentActions
        landlordClients={landlordClients}
        selectedLandlordClientId={
          selectedLandlordClientId
        }
        dateFrom={dateFrom}
        dateTo={dateTo}
        propertyId={selectedPropertyId}
        propertyDateFrom={propertyDateFrom}
        propertyDateTo={propertyDateTo}
      />

      <ManagerReportDocumentHistory
        documents={generatedDocuments}
        landlordClients={landlordClients}
        properties={properties}
      />

      {statementSummary ? (
        <>
          <ManagerLandlordStatementSummary
            summary={statementSummary}
          />

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
            Add a landlord before viewing landlord statements.
          </p>
        </section>
      )}
    </div>
  );
}
