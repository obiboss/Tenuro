import Link from "next/link";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutGrid,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  isManagerCurrentTenantStatus,
  type ManagerRentPaymentStatus,
} from "@/constants/manager";
import {
  redirect,
} from "next/navigation";
import { ManagerBankAccountGate } from "@/components/manager/manager-bank-account-gate";
import { ManagerExistingTenantSetupCard } from "@/components/manager/manager-existing-tenant-setup-card";
import { ManagerPropertyMaintenanceActivity } from "@/components/manager/manager-property-maintenance-activity";
import { ManagerPendingPropertyDetail } from "@/components/manager/manager-pending-property-detail";
import { ManagerTenantOnboardingForm } from "@/components/manager/manager-tenant-onboarding-form";
import { ManagerTenantOnboardingReviewList } from "@/components/manager/manager-tenant-onboarding-review-list";
import { ManagerUnitForm } from "@/components/manager/manager-unit-form";
import { ManagerUnitList } from "@/components/manager/manager-unit-list";
import { listManagerMaintenanceRequests } from "@/server/repositories/manager-maintenance.repository";
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

type PropertyTab =
  | "overview"
  | "units"
  | "payments"
  | "maintenance"
  | "documents";

type ManagerPropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
    addUnit?: string;
    onboardUnit?: string;
    tenantRequest?: string;
  }>;
};

const PROPERTY_TABS: Array<{
  id: PropertyTab;
  label: string;
  icon: LucideIcon;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutGrid,
  },
  {
    id: "units",
    label: "Units",
    icon: Building2,
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
  },
];

const OPEN_TENANT_REQUEST_STATUSES = new Set<
  ManagerTenantOnboardingRequestRow["status"]
>([
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
]);

function normalizePropertyTab(
  value: string | undefined,
): PropertyTab {
  if (
    value === "units" ||
    value === "payments" ||
    value === "maintenance" ||
    value === "documents"
  ) {
    return value;
  }

  return "overview";
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(
    date.length === 10
      ? new Date(`${date}T00:00:00Z`)
      : new Date(date),
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(Number(amount))
      ? Number(amount)
      : 0,
  );
}

function getDaysUntil(date: string | null) {
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(
    `${date}T00:00:00`,
  );
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      86_400_000,
  );
}

function formatRentAttentionStatus(params: {
  currentBalance: number;
  daysUntilDue: number | null;
}) {
  if (params.currentBalance > 0) {
    return {
      label: "Owing",
      className:
        "bg-danger-soft text-danger",
    };
  }

  if (
    params.daysUntilDue !== null &&
    params.daysUntilDue < 0
  ) {
    const days = Math.abs(
      params.daysUntilDue,
    );

    return {
      label: `Overdue by ${days} day${
        days === 1 ? "" : "s"
      }`,
      className:
        "bg-danger-soft text-danger",
    };
  }

  if (params.daysUntilDue === 0) {
    return {
      label: "Due today",
      className:
        "bg-warning-soft text-warning",
    };
  }

  return {
    label:
      params.daysUntilDue === null
        ? "Date not set"
        : `Due in ${
            params.daysUntilDue
          } day${
            params.daysUntilDue === 1
              ? ""
              : "s"
          }`,
    className:
      "bg-warning-soft text-warning",
  };
}

function getPaymentStatusLabel(
  status: ManagerRentPaymentStatus,
) {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "recorded") {
    return "Recorded";
  }

  if (status === "pending_confirmation") {
    return "Pending confirmation";
  }

  if (status === "reversed") {
    return "Reversed";
  }

  return "Rejected";
}

function getPaymentStatusClass(
  status: ManagerRentPaymentStatus,
) {
  if (
    status === "verified" ||
    status === "recorded"
  ) {
    return "bg-success-soft text-success";
  }

  if (
    status === "rejected" ||
    status === "reversed"
  ) {
    return "bg-danger-soft text-danger";
  }

  return "bg-warning-soft text-warning";
}

function getUnitSummary(params: {
  units: Awaited<
    ReturnType<typeof listManagerUnits>
  >;
  tenants: Awaited<
    ReturnType<typeof listManagerTenants>
  >;
}) {
  const occupancy =
    buildManagerOccupancySnapshot(params);

  return params.units.reduce(
    (summary, unit) => {
      summary.total += 1;

      if (
        occupancy.occupiedUnitIds.has(unit.id)
      ) {
        summary.occupied += 1;
      }

      if (
        occupancy.vacantUnitIds.has(unit.id)
      ) {
        summary.vacant += 1;
      }

      if (
        occupancy.reservedUnitIds.has(unit.id)
      ) {
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
        OPEN_TENANT_REQUEST_STATUSES.has(
          request.status,
        ),
    ) ?? null
  );
}

export default async function ManagerPropertyDetailPage({
  params,
  searchParams,
}: ManagerPropertyDetailPageProps) {
  const { propertyId } = await params;
  const resolvedSearchParams =
    await searchParams;

  const requestedTab = normalizePropertyTab(
    resolvedSearchParams?.tab,
  );
  const activeTab =
    resolvedSearchParams?.addUnit === "1" ||
    Boolean(
      resolvedSearchParams?.onboardUnit,
    ) ||
    Boolean(
      resolvedSearchParams?.tenantRequest,
    )
      ? "units"
      : requestedTab;

  const manager = await requireManager();
  const supabase =
    await createSupabaseServerClient();
  const adminSupabase =
    createSupabaseAdminClient();

  const organization =
    await getManagerOrganizationForCurrentUser(
      supabase,
      manager.id,
    );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  await expireManagerNewTenantPaymentRequests(
    adminSupabase,
  );

  const [
    landlordClients,
    properties,
    units,
    tenants,
    payments,
    maintenanceRequests,
    onboardingRequests,
    agreementDocuments,
    managerPaystackAccount,
  ] = await Promise.all([
    listManagerLandlordClients(
      supabase,
      organization.id,
    ),
    listManagerProperties(
      supabase,
      organization.id,
    ),
    listManagerUnits(supabase, {
      organizationId: organization.id,
    }),
    listManagerTenants(supabase, {
      organizationId: organization.id,
      propertyId,
    }),
    listManagerRentPayments(
      supabase,
      organization.id,
    ),
    listManagerMaintenanceRequests(
      supabase,
      organization.id,
    ),
    listManagerTenantOnboardingRequests(
      supabase,
      {
        organizationId: organization.id,
        propertyId,
      },
    ),
    listManagerTenantAgreementDocuments(
      supabase,
      {
        organizationId: organization.id,
        propertyId,
      },
    ),
    getActiveManagerPaystackAccount(
      adminSupabase,
      organization.id,
    ),
  ]);

  const property = properties.find(
    (item) => item.id === propertyId,
  );

  if (!property) {
    return <ManagerPendingPropertyDetail propertyId={propertyId} />;
  }

  const landlord = landlordClients.find(
    (client) =>
      client.id ===
      property.landlord_client_id,
  );

  const propertyUnits = units.filter(
    (unit) =>
      unit.property_id === property.id,
  );

  const unitSummary = getUnitSummary({
    units: propertyUnits,
    tenants,
  });

  const submittedRequests =
    onboardingRequests.filter(
      (request) =>
        request.status === "submitted",
    );
  const firstSubmittedRequest =
    submittedRequests[0] ?? null;

  const selectedUnit =
    resolvedSearchParams?.onboardUnit
      ? propertyUnits.find(
          (unit) =>
            unit.id ===
            resolvedSearchParams.onboardUnit,
        )
      : null;

  const selectedOpenTenantRequest =
    selectedUnit
      ? getOpenTenantRequestForUnit({
          requests: onboardingRequests,
          unitId: selectedUnit.id,
        })
      : null;

  const canShowTenantForm = Boolean(
    selectedUnit &&
      ((selectedUnit.status === "vacant" &&
        !selectedOpenTenantRequest) ||
        selectedOpenTenantRequest?.status ===
          "pending"),
  );

  const managerPayoutStatus =
    managerPaystackAccount
      ?.verification_status ?? null;

  const isManagerPayoutVerified = Boolean(
    managerPaystackAccount
      ?.verification_status === "verified" &&
      managerPaystackAccount.verified_at,
  );

  const shouldShowAddUnitForm =
    resolvedSearchParams?.addUnit === "1";
  const needsExistingTenantSetup =
    property.existing_tenant_setup_required &&
    !property.existing_tenant_setup_completed_at;

  const tenantNameById = new Map(
    tenants.map((tenant) => [
      tenant.id,
      tenant.full_name,
    ]),
  );
  const unitLabelById = new Map(
    propertyUnits.map((unit) => [
      unit.id,
      unit.unit_label,
    ]),
  );

  const propertyPayments = payments
    .filter(
      (payment) =>
        payment.property_id === property.id,
    )
    .sort((first, second) => {
      const dateOrder =
        second.payment_date.localeCompare(
          first.payment_date,
        );

      return dateOrder !== 0
        ? dateOrder
        : second.created_at.localeCompare(
            first.created_at,
          );
    });

  const downloadableAgreements =
    agreementDocuments.filter(
      (agreement) =>
        agreement.document_status ===
        "accepted",
    );

  const downloadablePayments =
    propertyPayments.filter(
      (payment) =>
        payment.status === "verified" ||
        payment.status === "recorded",
    );

  const propertyMaintenanceRequests =
    maintenanceRequests.filter(
      (request) =>
        request.property_id === property.id,
    );
  const openMaintenanceRequests =
    propertyMaintenanceRequests.filter(
      (request) =>
        request.status === "reported" ||
        request.status === "in_progress",
    );

  const rentAttention = tenants
    .filter((tenant) =>
      isManagerCurrentTenantStatus(
        tenant.status,
      ),
    )
    .map((tenant) => {
      const currentBalance = Number(
        tenant.current_balance,
      );
      const daysUntilDue = getDaysUntil(
        tenant.next_rent_due_date,
      );

      return {
        tenant,
        currentBalance:
          Number.isFinite(currentBalance)
            ? currentBalance
            : 0,
        daysUntilDue,
      };
    })
    .filter(
      (item) =>
        item.currentBalance > 0 ||
        (item.daysUntilDue !== null &&
          item.daysUntilDue <= 30),
    )
    .sort((first, second) => {
      if (
        first.currentBalance > 0 &&
        second.currentBalance <= 0
      ) {
        return -1;
      }

      if (
        first.currentBalance <= 0 &&
        second.currentBalance > 0
      ) {
        return 1;
      }

      return (
        (first.daysUntilDue ??
          Number.MAX_SAFE_INTEGER) -
        (second.daysUntilDue ??
          Number.MAX_SAFE_INTEGER)
      );
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ManagerBankAccountGate
        verificationStatus={
          managerPayoutStatus
        }
      />

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

      <div className="flex min-w-0 items-end gap-3 border-b border-border-soft">
        <nav
          aria-label="Property sections"
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <div className="flex min-w-max gap-1">
            {PROPERTY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activeTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={`/manager/properties/${property.id}?tab=${tab.id}`}
                  prefetch={false}
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                  className={
                    isActive
                      ? "-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 border-text-strong px-4 text-sm font-black text-text-strong"
                      : "-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-bold text-text-muted transition hover:text-text-strong"
                  }
                >
                  <Icon
                    className="size-4"
                    aria-hidden="true"
                  />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <Link
          href={`/manager/properties/${property.id}/settings`}
          prefetch={false}
          aria-label="Property settings"
          title="Property settings"
          className="mb-1 inline-flex size-10 shrink-0 items-center justify-center rounded-button text-text-muted transition hover:bg-surface hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Settings
            className="size-5"
            aria-hidden="true"
          />
        </Link>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <section className="rounded-card border border-border-soft bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black tracking-tight text-text-strong">
                Rent due and owing
              </h2>

              <Link
                href={`/manager/tenants?propertyId=${property.id}`}
                prefetch={false}
                className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
              >
                View all tenants
              </Link>
            </div>

            {rentAttention.length > 0 ? (
              <div className="divide-y divide-border-soft">
                {rentAttention
                  .slice(0, 6)
                  .map(
                    ({
                      tenant,
                      currentBalance,
                      daysUntilDue,
                    }) => {
                      const status =
                        formatRentAttentionStatus({
                          currentBalance,
                          daysUntilDue,
                        });

                      return (
                        <article
                          key={tenant.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-black text-text-strong">
                              {
                                tenant.full_name
                              }
                            </p>
                            <p className="mt-1 text-sm font-semibold text-text-muted">
                              {unitLabelById.get(
                                tenant.unit_id,
                              ) ?? "Unit"}{" "}
                              · Next due{" "}
                              {formatDate(
                                tenant.next_rent_due_date,
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {currentBalance >
                            0 ? (
                              <span className="text-sm font-black text-danger">
                                {formatMoney(
                                  currentBalance,
                                )}
                              </span>
                            ) : null}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        </article>
                      );
                    },
                  )}
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm font-semibold leading-6 text-text-muted">
                  No tenant in this property is
                  owing or due within the next 30
                  days.
                </p>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-card border border-border-soft bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-text-strong">
                Maintenance
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                {openMaintenanceRequests.length ===
                0
                  ? "No open issues"
                  : `${
                      openMaintenanceRequests.length
                    } open issue${
                      openMaintenanceRequests.length ===
                      1
                        ? ""
                        : "s"
                    }`}
              </p>
            </div>

            <Link
              href={`/manager/properties/${property.id}?tab=maintenance`}
              prefetch={false}
              className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
            >
              View
            </Link>
          </section>
        </div>
      ) : null}

      {activeTab === "units" ? (
        <div className="space-y-5">
          {submittedRequests.length > 0 ? (
            <section className="rounded-card border border-warning/20 bg-warning-soft p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-text-strong">
                    {
                      submittedRequests.length
                    }{" "}
                    tenant{" "}
                    {submittedRequests.length ===
                    1
                      ? "submission"
                      : "submissions"}{" "}
                    waiting for review
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Open the submitted tenant
                    details to approve or reject
                    the request.
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
              propertyName={
                property.property_name
              }
              hasUnits={
                propertyUnits.length > 0
              }
            />
          ) : null}

          <ManagerUnitList
            properties={[property]}
            units={propertyUnits}
            tenants={tenants}
            onboardingRequests={
              onboardingRequests
            }
            showTenantActions
            propertyDetailTab="units"
            addUnitHref={`/manager/properties/${property.id}?tab=units&addUnit=1#add-unit`}
          />

          {canShowTenantForm &&
          selectedUnit ? (
            <ManagerTenantOnboardingForm
              property={property}
              unit={selectedUnit}
              isManagerPayoutVerified={
                isManagerPayoutVerified
              }
              managerPayoutStatus={
                managerPayoutStatus
              }
              existingRequest={
                selectedOpenTenantRequest
              }
            />
          ) : resolvedSearchParams?.onboardUnit &&
            !selectedOpenTenantRequest ? (
            <section
              id="tenant-onboarding"
              className="rounded-card border border-border-soft bg-white p-4 shadow-sm"
            >
              <p className="font-black text-text-strong">
                Tenant form unavailable
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                This unit is no longer available
                for a new tenant request. It may
                already have a tenant request in
                progress.
              </p>
            </section>
          ) : null}

          <ManagerTenantOnboardingReviewList
            requests={onboardingRequests}
            initialSelectedRequestId={
              resolvedSearchParams?.tenantRequest ??
              null
            }
          />

          {shouldShowAddUnitForm ? (
            <section id="add-unit">
              <ManagerUnitForm
                properties={[property]}
                lockedPropertyId={
                  property.id
                }
              />
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <section className="rounded-card border border-border-soft bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-text-strong">
                Payments
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Recent rent payments recorded for
                this property.
              </p>
            </div>

            <Link
              href={`/manager/payments?propertyId=${property.id}`}
              prefetch={false}
              className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
            >
              View all payments
            </Link>
          </div>

          {propertyPayments.length > 0 ? (
            <div className="divide-y divide-border-soft">
              {propertyPayments
                .slice(0, 10)
                .map((payment) => (
                  <article
                    key={payment.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-text-strong">
                        {tenantNameById.get(
                          payment.tenant_id,
                        ) ?? "Tenant"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {unitLabelById.get(
                          payment.unit_id,
                        ) ?? "Unit"}{" "}
                        ·{" "}
                        {formatDate(
                          payment.payment_date,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span className="font-black text-text-strong">
                        {formatMoney(
                          payment.amount_paid,
                        )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getPaymentStatusClass(
                          payment.status,
                        )}`}
                      >
                        {getPaymentStatusLabel(
                          payment.status,
                        )}
                      </span>

                      {payment.status ===
                        "verified" ||
                      payment.status ===
                        "recorded" ? (
                        <Link
                          href={`/manager/receipts/${payment.id}/download`}
                          prefetch={false}
                          className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
                        >
                          Receipt
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm font-semibold leading-6 text-text-muted">
                No payment has been recorded for
                this property.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "maintenance" ? (
        <ManagerPropertyMaintenanceActivity
          propertyId={property.id}
          units={propertyUnits}
          tenants={tenants}
          maintenanceRequests={
            propertyMaintenanceRequests
          }
        />
      ) : null}

      {activeTab === "documents" ? (
        <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Documents
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Download agreements and rent receipts
              for this property.
            </p>
          </div>

          {downloadableAgreements.length >
            0 ||
          downloadablePayments.length > 0 ? (
            <div className="mt-4 divide-y divide-border-soft">
              {downloadableAgreements.map(
                (agreement) => (
                  <article
                    key={`agreement-${agreement.id}`}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-text-strong">
                        Tenancy agreement
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {tenantNameById.get(
                          agreement.tenant_id,
                        ) ?? "Tenant"}{" "}
                        · accepted{" "}
                        {formatDate(
                          agreement.tenant_accepted_at,
                        )}
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
                ),
              )}

              {downloadablePayments.map(
                (payment) => (
                  <article
                    key={`receipt-${payment.id}`}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-text-strong">
                        Rent receipt
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {tenantNameById.get(
                          payment.tenant_id,
                        ) ?? "Tenant"}{" "}
                        · payment{" "}
                        {formatDate(
                          payment.payment_date,
                        )}
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
                ),
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
              No agreement or rent receipt is
              available for this property yet.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
