import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  FileSignature,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { MoveOutConfirmationCard } from "@/components/quit-notices/move-out-confirmation-card";
import { RentPaymentModal } from "@/components/payment/rent-payment-modal";
import { QuitNoticeIssueCard } from "@/components/quit-notices/quit-notice-issue-card";
import { OnboardingInviteCard } from "@/components/tenant/onboarding-invite-card";
import { TenantActivationInviteCard } from "@/components/tenant/tenant-activation-invite-card";
import { TenantReviewCard } from "@/components/tenant/tenant-review-card";
import { LandlordTenancyChargeForm } from "@/components/tenancy/landlord-tenancy-charge-form";
import { LandlordTenancyChargeList } from "@/components/tenancy/landlord-tenancy-charge-list";
import { TenancyAgreementDocumentCard } from "@/components/tenancy/tenancy-agreement-document-card";
import { TenancyForm } from "@/components/tenancy/tenancy-form";
import { TenancySummaryCard } from "@/components/tenancy/tenancy-summary-card";
import { TenantBalanceCard } from "@/components/tenancy/tenant-balance-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { TENANT_ONBOARDING_STATUS_COPY } from "@/lib/status-copy";
import { getLandlordChargesForCurrentLandlord } from "@/server/services/landlord-tenancy-charges.service";
import { getCurrentTenantLedgerSummary } from "@/server/services/ledger.service";
import {
  getCurrentTenancyAgreementByTenancyId,
  getCurrentTenancyAgreementPdfDownloadUrl,
} from "@/server/services/tenancy-agreements.service";
import {
  getCurrentLandlordTenant,
  getCurrentLandlordTenantGuarantor,
  getCurrentLandlordTenantKycDocumentLinks,
} from "@/server/services/tenants.service";
import { getCurrentTenantActiveTenancy } from "@/server/services/tenancies.service";
import { getCurrentLandlordQuitNoticesForTenancy } from "@/server/services/quit-notices.service";
import { getCurrentLandlordTenantAgentCommissionAmount } from "@/server/services/tenant-agent-commission.service";

type TenantDetailPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

function sumCharges(
  charges: Awaited<ReturnType<typeof getLandlordChargesForCurrentLandlord>>,
) {
  return charges.reduce((total, charge) => total + Number(charge.amount), 0);
}

export default async function TenantDetailPage({
  params,
}: TenantDetailPageProps) {
  const { tenantId } = await params;

  const [tenant, guarantor, kycDocuments, activeTenancy, ledgerSummary] =
    await Promise.all([
      getCurrentLandlordTenant(tenantId),
      getCurrentLandlordTenantGuarantor(tenantId),
      getCurrentLandlordTenantKycDocumentLinks(tenantId),
      getCurrentTenantActiveTenancy(tenantId),
      getCurrentTenantLedgerSummary(tenantId),
    ]);

  const agreementDocument = activeTenancy
    ? await getCurrentTenancyAgreementByTenancyId(activeTenancy.id)
    : null;

  const agreementPdfDownloadUrl = agreementDocument?.pdf_path
    ? await getCurrentTenancyAgreementPdfDownloadUrl(agreementDocument.id)
    : null;

  const quitNotices = activeTenancy
    ? await getCurrentLandlordQuitNoticesForTenancy(activeTenancy.id)
    : [];

  const landlordCharges = activeTenancy
    ? await getLandlordChargesForCurrentLandlord(activeTenancy.id)
    : [];

  const landlordChargesAmount = sumCharges(landlordCharges);

  const agentCommissionAmount =
    await getCurrentLandlordTenantAgentCommissionAmount(tenant.id);

  const tenuroFeeAmount = Number(
    process.env.TENURO_GATEWAY_ADMIN_FEE_NAIRA ?? 0,
  );

  const status =
    TENANT_ONBOARDING_STATUS_COPY[tenant.onboarding_status] ??
    TENANT_ONBOARDING_STATUS_COPY.invited;

  const outstandingBalance = ledgerSummary.balance?.outstanding_balance ?? 0;
  const hasOutstandingBalance = Boolean(
    ledgerSummary.balance && outstandingBalance > 0,
  );

  const isAgreementAccepted = agreementDocument?.document_status === "accepted";
  const isTenantApproved = tenant.onboarding_status === "approved";
  const isRentSettled = Boolean(
    ledgerSummary.balance && outstandingBalance <= 0,
  );

  const canSendPaymentLink = Boolean(
    activeTenancy && hasOutstandingBalance && isAgreementAccepted,
  );

  const shouldShowPaymentLockedNotice = Boolean(
    activeTenancy && hasOutstandingBalance && !isAgreementAccepted,
  );

  const canCreateTenancyRecord = isTenantApproved && !activeTenancy;

  const canIssueQuitNotice = Boolean(
    activeTenancy && activeTenancy.status === "active",
  );

  const shouldShowOnboardingCard =
    tenant.onboarding_status === "invited" ||
    tenant.onboarding_status === "rejected";

  const shouldShowActivationCard = Boolean(
    isTenantApproved &&
    activeTenancy &&
    isAgreementAccepted &&
    isRentSettled &&
    !tenant.profile_id,
  );

  const nextStepDescription = tenant.profile_id
    ? "This tenant already has an active tenant account."
    : tenant.onboarding_status === "profile_complete"
      ? "Review the tenant KYC submission and approve the tenant before creating the tenancy record."
      : !isTenantApproved
        ? "Send the tenant onboarding link so they can complete their profile, ID document, and guarantor details."
        : !activeTenancy
          ? "Create the tenancy record using the approved tenant and assigned unit. After that, prepare and send the tenancy agreement."
          : !agreementDocument
            ? "Generate the tenancy agreement draft before sending it to the tenant."
            : !isAgreementAccepted
              ? "Send the agreement acceptance link to the tenant."
              : hasOutstandingBalance
                ? "Send the tenant rent payment link before account activation."
                : "Send the tenant activation link so they can set their password and access their dashboard.";

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
        description="Tenant record, assigned unit, documents, tenancy record, and payment history."
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

          <TenantReviewCard
            tenant={tenant}
            guarantor={guarantor}
            documents={kycDocuments}
          />

          {activeTenancy ? (
            <>
              <TenancySummaryCard tenancy={activeTenancy} />

              <SectionCard
                title="Landlord Charges"
                description="Add agreement fee, caution deposit, damages deposit, service charge, legal fee, documentation fee, or other charges that should be paid to the landlord."
              >
                <div className="space-y-6">
                  <LandlordTenancyChargeList
                    tenancyId={activeTenancy.id}
                    charges={landlordCharges}
                  />

                  <div className="rounded-card border border-border-soft bg-surface p-4">
                    <LandlordTenancyChargeForm tenancyId={activeTenancy.id} />
                  </div>
                </div>
              </SectionCard>

              <TenancyAgreementDocumentCard
                tenancyId={activeTenancy.id}
                agreement={agreementDocument}
                pdfDownloadUrl={agreementPdfDownloadUrl}
              />
            </>
          ) : null}

          {canCreateTenancyRecord ? (
            <SectionCard
              title="Create Tenancy and Agreement Setup"
              description="Confirm rent, tenancy dates, opening balance, and agreement notes. After this record is created, BOPA will show the agreement draft step."
            >
              <TrustNotice
                title="Landlord confirmation required"
                description="The tenant has been approved. Confirm the tenancy terms before the agreement is generated so the final document uses landlord-approved details."
                icon={
                  <FileSignature
                    aria-hidden="true"
                    size={22}
                    strokeWidth={2.6}
                  />
                }
              />

              <div className="mt-5">
                <TenancyForm
                  tenantId={tenant.id}
                  unitId={tenant.unit_id}
                  defaultAnnualRent={tenant.units?.annual_rent ?? null}
                />
              </div>
            </SectionCard>
          ) : null}

          {!activeTenancy && !isTenantApproved ? (
            <SectionCard
              title="Tenancy Record Locked"
              description="Approve the tenant before creating the tenancy record."
            >
              <TrustNotice
                title="Tenant approval required"
                description="The tenancy record and agreement steps should only start after the tenant KYC has been reviewed and approved."
                icon={
                  <FileCheck2 aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </SectionCard>
          ) : null}

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
                title="No tenancy record yet"
                description="Create a tenancy record first so BOPA can start tracking rent balance."
                icon={
                  <FileCheck2 aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </SectionCard>
          )}

          {shouldShowPaymentLockedNotice ? (
            <SectionCard
              title="Payment Link Locked"
              description="The rent payment link becomes available after the tenant accepts the tenancy agreement."
            >
              <TrustNotice
                title="Agreement acceptance required"
                description="Send the agreement acceptance link to the tenant. Once the tenant accepts the agreement, you can send the rent payment link."
                icon={
                  <FileSignature
                    aria-hidden="true"
                    size={22}
                    strokeWidth={2.6}
                  />
                }
              />
            </SectionCard>
          ) : null}

          {canSendPaymentLink && activeTenancy ? (
            <SectionCard
              title="Send Tenant Payment Link"
              description="Send a secure Paystack rent payment link to the tenant on WhatsApp. The tenant must fully settle the balance before account activation becomes available."
            >
              <RentPaymentModal
                tenancyId={activeTenancy.id}
                defaultAmount={outstandingBalance}
                landlordChargesAmount={landlordChargesAmount}
                agentCommissionAmount={agentCommissionAmount}
                tenuroFeeAmount={tenuroFeeAmount}
                periodStart={activeTenancy.start_date}
                periodEnd={activeTenancy.end_date}
              />
            </SectionCard>
          ) : null}

          {canIssueQuitNotice && activeTenancy ? (
            <SectionCard
              title="Issue Quit Notice"
              description="Prepare a formal quit notice PDF and WhatsApp draft for this tenant. This does not end the tenancy or make the unit vacant."
            >
              <QuitNoticeIssueCard
                tenantId={tenant.id}
                tenancyId={activeTenancy.id}
              />
            </SectionCard>
          ) : null}

          {activeTenancy ? (
            <SectionCard
              title="Confirm Move-Out"
              description="Use this only after the tenant has actually moved out and the unit should become vacant."
            >
              <MoveOutConfirmationCard
                tenantId={tenant.id}
                notices={quitNotices}
              />
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <TrustNotice title="Next step" description={nextStepDescription} />

          {activeTenancy ? (
            <TrustNotice
              title="Final payment model"
              description="The tenant pays rent, landlord charges, approved agent commission, and BOPA fee. Landlord charges go to the landlord. Agent commission goes to the agent."
              icon={
                <ReceiptText aria-hidden="true" size={22} strokeWidth={2.6} />
              }
            />
          ) : null}

          {shouldShowOnboardingCard ? (
            <OnboardingInviteCard tenantId={tenant.id} />
          ) : null}

          {shouldShowActivationCard ? (
            <TenantActivationInviteCard tenantId={tenant.id} />
          ) : null}

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
