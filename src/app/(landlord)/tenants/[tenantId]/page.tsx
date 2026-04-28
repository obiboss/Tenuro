import Link from "next/link";
import { ArrowLeft, FileCheck2, Phone, UserRound } from "lucide-react";
import { RentPaymentModal } from "@/components/payment/rent-payment-modal";
import { OnboardingInviteCard } from "@/components/tenant/onboarding-invite-card";
import { TenancyForm } from "@/components/tenancy/tenancy-form";
import { TenancySummaryCard } from "@/components/tenancy/tenancy-summary-card";
import { TenantBalanceCard } from "@/components/tenancy/tenant-balance-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { TENANT_ONBOARDING_STATUS_COPY } from "@/lib/status-copy";
import { getCurrentTenantLedgerSummary } from "@/server/services/ledger.service";
import { getCurrentLandlordTenant } from "@/server/services/tenants.service";
import { getCurrentTenantActiveTenancy } from "@/server/services/tenancies.service";

type TenantDetailPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function TenantDetailPage({
  params,
}: TenantDetailPageProps) {
  const { tenantId } = await params;

  const [tenant, activeTenancy, ledgerSummary] = await Promise.all([
    getCurrentLandlordTenant(tenantId),
    getCurrentTenantActiveTenancy(tenantId),
    getCurrentTenantLedgerSummary(tenantId),
  ]);

  const status =
    TENANT_ONBOARDING_STATUS_COPY[tenant.onboarding_status] ??
    TENANT_ONBOARDING_STATUS_COPY.invited;

  const outstandingBalance = ledgerSummary.balance?.outstanding_balance ?? 0;
  const canCollectOnline = Boolean(
    activeTenancy && ledgerSummary.balance && outstandingBalance > 0,
  );

  return (
    <div>
      <Link
        href="/tenants"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to tenants
      </Link>

      <PageHeader
        title={tenant.full_name}
        description="Tenant record, assigned unit, documents, rental agreement, and payment history."
        action={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Summary</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <UserRound aria-hidden="true" size={18} strokeWidth={2.5} />
                    <p className="text-sm font-bold">Tenant Name</p>
                  </div>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {tenant.full_name}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Phone aria-hidden="true" size={18} strokeWidth={2.5} />
                    <p className="text-sm font-bold">Phone Number</p>
                  </div>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {tenant.phone_number}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Property</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {tenant.units?.properties?.property_name ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Unit</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {tenant.units?.unit_identifier ?? "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {activeTenancy ? (
            <TenancySummaryCard tenancy={activeTenancy} />
          ) : (
            <SectionCard
              title="Create Rental Agreement"
              description="Set the rent amount, payment frequency, dates, and opening balance."
            >
              <TenancyForm
                tenantId={tenant.id}
                unitId={tenant.unit_id}
                defaultAnnualRent={tenant.units?.annual_rent ?? null}
              />
            </SectionCard>
          )}

          {ledgerSummary.balance ? (
            <TenantBalanceCard
              balance={ledgerSummary.balance}
              entries={ledgerSummary.entries}
            />
          ) : (
            <SectionCard
              title="Rent Balance"
              description="Rent charges, payments, and outstanding balance will appear here."
            >
              <TrustNotice
                title="No rental agreement yet"
                description="Create a rental agreement first so Tenuro can start tracking rent balance."
                icon={
                  <FileCheck2 aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </SectionCard>
          )}

          {canCollectOnline && activeTenancy ? (
            <SectionCard
              title="Collect Rent Online"
              description="Create a secure Paystack payment link for this tenant."
            >
              <RentPaymentModal
                tenancyId={activeTenancy.id}
                defaultAmount={outstandingBalance}
              />
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <TrustNotice
            title="Next step"
            description="Generate and send the tenant onboarding link so they can complete their profile, ID document, and guarantor details."
          />

          <OnboardingInviteCard tenantId={tenant.id} />

          <SectionCard
            title="Private Note"
            description="Only you can see this note."
          >
            <p className="text-sm leading-6 text-text-normal">
              {tenant.landlord_notes || "No private note added."}
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
