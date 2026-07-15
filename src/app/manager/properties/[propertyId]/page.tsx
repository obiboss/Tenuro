import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ManagerBankAccountGate } from "@/components/manager/manager-bank-account-gate";
import { ManagerExistingTenantSetupCard } from "@/components/manager/manager-existing-tenant-setup-card";
import { ManagerTenantOnboardingForm } from "@/components/manager/manager-tenant-onboarding-form";
import { ManagerTenantOnboardingReviewList } from "@/components/manager/manager-tenant-onboarding-review-list";
import { ManagerUnitForm } from "@/components/manager/manager-unit-form";
import { ManagerUnitList } from "@/components/manager/manager-unit-list";
import { getActiveManagerPaystackAccount } from "@/server/repositories/manager-paystack-accounts.repository";
import { expireManagerNewTenantPaymentRequests } from "@/server/repositories/manager-paystack.repository";
import {
  buildManagerOccupancySnapshot,
  getManagerOrganizationForCurrentUser,
  listManagerLandlordClients,
  listManagerProperties,
  listManagerRentPayments,
  listManagerTenants,
  listManagerUnits,
} from "@/server/repositories/manager.repository";
import {
  listManagerTenantAgreementDocuments,
  listManagerTenantOnboardingRequests,
  type ManagerTenantOnboardingRequestRow,
} from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerPropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    addUnit?: string;
    onboardUnit?: string;
    tenantRequest?: string;
  }>;
};

const OPEN_TENANT_REQUEST_STATUSES = new Set<
  ManagerTenantOnboardingRequestRow["status"]
>([
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
]);

function formatFee(params: {
  management_fee_type: "percentage" | "flat";
  management_fee_value: number;
}) {
  const value = Number(params.management_fee_value);

  if (!Number.isFinite(value) || value <= 0) {
    return "No fee";
  }

  if (params.management_fee_type === "percentage") {
    return `${value.toLocaleString("en-NG")}%`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCollectionSummary(collectionMode: string) {
  if (collectionMode === "manager_collects") {
    return "Manager collects";
  }

  if (collectionMode === "landlord_direct") {
    return "Landlord direct";
  }

  return "Automatic split";
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getUnitSummary(params: {
  units: Awaited<ReturnType<typeof listManagerUnits>>;
  tenants: Awaited<ReturnType<typeof listManagerTenants>>;
}) {
  const occupancy = buildManagerOccupancySnapshot(params);

  return params.units.reduce(
    (summary, unit) => {
      summary.total += 1;

      if (occupancy.occupiedUnitIds.has(unit.id)) {
        summary.occupied += 1;
      }

      if (occupancy.vacantUnitIds.has(unit.id)) {
        summary.vacant += 1;
      }

      if (occupancy.reservedUnitIds.has(unit.id)) {
        summary.reserved += 1;
      }

      return summary;
    },
    {
      total: 0,
      occupied: 0,
      vacant: 0,
      reserved: 0,
    },
  );
}

function getOpenTenantRequestForUnit(params: {
  requests: ManagerTenantOnboardingRequestRow[];
  unitId: string;
}) {
  return (
    params.requests.find(
      (request) =>
        request.unit_id === params.unitId &&
        OPEN_TENANT_REQUEST_STATUSES.has(request.status),
    ) ?? null
  );
}

export default async function ManagerPropertyDetailPage({
  params,
  searchParams,
}: ManagerPropertyDetailPageProps) {
  const { propertyId } = await params;
  const resolvedSearchParams = await searchParams;

  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  await expireManagerNewTenantPaymentRequests(adminSupabase);

  const [
    landlordClients,
    properties,
    units,
    tenants,
    payments,
    onboardingRequests,
    agreementDocuments,
    managerPaystackAccount,
  ] = await Promise.all([
    listManagerLandlordClients(supabase, organization.id),
    listManagerProperties(supabase, organization.id),
    listManagerUnits(supabase, { organizationId: organization.id }),
    listManagerTenants(supabase, {
      organizationId: organization.id,
      propertyId,
    }),
    listManagerRentPayments(supabase, organization.id),
    listManagerTenantOnboardingRequests(supabase, {
      organizationId: organization.id,
      propertyId,
    }),
    listManagerTenantAgreementDocuments(supabase, {
      organizationId: organization.id,
      propertyId,
    }),
    getActiveManagerPaystackAccount(adminSupabase, organization.id),
  ]);

  const property = properties.find((item) => item.id === propertyId);

  if (!property) {
    notFound();
  }

  const landlord = landlordClients.find(
    (client) => client.id === property.landlord_client_id,
  );

  const propertyUnits = units.filter(
    (unit) => unit.property_id === property.id,
  );

  const unitSummary = getUnitSummary({
    units: propertyUnits,
    tenants,
  });

  const submittedRequests = onboardingRequests.filter(
    (request) => request.status === "submitted",
  );
  const firstSubmittedRequest = submittedRequests[0] ?? null;

  const selectedUnit = resolvedSearchParams?.onboardUnit
    ? propertyUnits.find((unit) => unit.id === resolvedSearchParams.onboardUnit)
    : null;

  const selectedOpenTenantRequest = selectedUnit
    ? getOpenTenantRequestForUnit({
        requests: onboardingRequests,
        unitId: selectedUnit.id,
      })
    : null;

  const canShowTenantForm = Boolean(
    selectedUnit &&
      ((selectedUnit.status === "vacant" && !selectedOpenTenantRequest) ||
        selectedOpenTenantRequest?.status === "pending"),
  );

  const managerPayoutStatus =
    managerPaystackAccount?.verification_status ?? null;

  const isManagerPayoutVerified = Boolean(
    managerPaystackAccount?.verification_status === "verified" &&
    managerPaystackAccount.verified_at,
  );

  const shouldShowAddUnitForm =
    resolvedSearchParams?.addUnit === "1" || propertyUnits.length === 0;
  const needsExistingTenantSetup =
    property.existing_tenant_setup_required &&
    !property.existing_tenant_setup_completed_at;
  const tenantNameById = new Map(
    tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );
  const downloadableAgreements = agreementDocuments.filter(
    (agreement) => agreement.document_status === "accepted",
  );
  const downloadablePayments = payments.filter(
    (payment) =>
      payment.property_id === property.id &&
      (payment.status === "verified" || payment.status === "recorded"),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ManagerBankAccountGate verificationStatus={managerPayoutStatus} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/manager/properties"
            prefetch={false}
            className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
          >
            ← Properties
          </Link>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-text-strong">
            {property.property_name}
          </h1>

          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            {property.property_address}
          </p>

          {landlord ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Landlord:{" "}
              <span className="font-black text-text-strong">
                {landlord.landlord_name}
              </span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[32rem]">
          <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Units
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {unitSummary.total}
            </p>
          </div>

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Vacant
            </p>
            <p className="mt-1 text-xl font-black text-warning">
              {unitSummary.vacant}
            </p>
          </div>

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Occupied
            </p>
            <p className="mt-1 text-xl font-black text-success">
              {unitSummary.occupied}
            </p>
          </div>

          <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Reserved
            </p>
            <p className="mt-1 text-xl font-black text-primary">
              {unitSummary.reserved}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Rent collection
          </p>
          <p className="mt-1 text-sm font-black text-text-strong">
            {getCollectionSummary(property.collection_mode)}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Management fee
          </p>
          <p className="mt-1 text-sm font-black text-text-strong">
            {formatFee(property)}
          </p>
        </div>

        <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-text-muted">
            Paystack charge
          </p>
          <p className="mt-1 text-sm font-black text-text-strong">
            {property.paystack_charge_bearer}
          </p>
        </div>
      </section>

      {submittedRequests.length > 0 ? (
        <section className="rounded-card border border-warning/20 bg-warning-soft p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-text-strong">
                {submittedRequests.length} tenant{" "}
                {submittedRequests.length === 1 ? "submission" : "submissions"}{" "}
                waiting for review
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Open the submitted tenant details to approve or reject the
                request.
              </p>
            </div>

            <Link
              href={
                firstSubmittedRequest
                  ? `/manager/tenants/review/${firstSubmittedRequest.id}`
                  : "#tenant-review"
              }
              prefetch={false}
              className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              Review now
            </Link>
          </div>
        </section>
      ) : null}

      {needsExistingTenantSetup ? (
        <ManagerExistingTenantSetupCard
          propertyId={property.id}
          propertyName={property.property_name}
          hasUnits={propertyUnits.length > 0}
        />
      ) : null}

      <ManagerUnitList
        properties={[property]}
        units={propertyUnits}
        tenants={tenants}
        onboardingRequests={onboardingRequests}
        showTenantActions
        addUnitHref={`/manager/properties/${property.id}?addUnit=1#add-unit`}
      />

      {downloadableAgreements.length > 0 || downloadablePayments.length > 0 ? (
        <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Documents
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Download agreements and rent receipts for this property.
            </p>
          </div>

          <div className="mt-4 divide-y divide-border-soft">
            {downloadableAgreements.map((agreement) => (
              <article
                key={`agreement-${agreement.id}`}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-text-strong">
                    Tenancy agreement
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {tenantNameById.get(agreement.tenant_id) ?? "Tenant"} -
                    accepted {formatDate(agreement.tenant_accepted_at)}
                  </p>
                </div>

                <Link
                  href={`/manager/agreements/${agreement.id}/download`}
                  prefetch={false}
                  className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  Download agreement
                </Link>
              </article>
            ))}

            {downloadablePayments.map((payment) => (
              <article
                key={`receipt-${payment.id}`}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-text-strong">Rent receipt</p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {tenantNameById.get(payment.tenant_id) ?? "Tenant"} -
                    payment {formatDate(payment.payment_date)}
                  </p>
                </div>

                <Link
                  href={`/manager/receipts/${payment.id}/download`}
                  prefetch={false}
                  className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  Download receipt
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {canShowTenantForm && selectedUnit ? (
        <ManagerTenantOnboardingForm
          property={property}
          unit={selectedUnit}
          isManagerPayoutVerified={isManagerPayoutVerified}
          managerPayoutStatus={managerPayoutStatus}
          existingRequest={selectedOpenTenantRequest}
        />
      ) : resolvedSearchParams?.onboardUnit && !selectedOpenTenantRequest ? (
        <section
          id="tenant-onboarding"
          className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
        >
          <p className="font-black text-text-strong">Tenant form unavailable</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            This unit is no longer available for a new tenant request. It may
            already have a tenant request in progress.
          </p>
        </section>
      ) : null}

      <ManagerTenantOnboardingReviewList
        requests={onboardingRequests}
        initialSelectedRequestId={resolvedSearchParams?.tenantRequest ?? null}
      />

      {shouldShowAddUnitForm ? (
        <section id="add-unit">
          <ManagerUnitForm
            properties={[property]}
            lockedPropertyId={property.id}
          />
        </section>
      ) : null}
    </div>
  );
}
