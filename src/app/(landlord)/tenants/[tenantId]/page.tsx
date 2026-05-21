import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  FileSignature,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { AgreementDraftPreview } from "@/components/tenancy/agreement-draft-preview";
import { MoveOutConfirmationCard } from "@/components/quit-notices/move-out-confirmation-card";
import { PayoutPaymentGateNotice } from "@/components/payment/payout-payment-gate-notice";
import { RentPaymentModal } from "@/components/payment/rent-payment-modal";
import { QuitNoticeIssueCard } from "@/components/quit-notices/quit-notice-issue-card";
import { OnboardingInviteCard } from "@/components/tenant/onboarding-invite-card";
import { TenantActivationInviteCard } from "@/components/tenant/tenant-activation-invite-card";
import { TenantReviewCard } from "@/components/tenant/tenant-review-card";
import { LandlordTenancyChargePanel } from "@/components/tenancy/landlord-tenancy-charge-panel";
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
import { resolveTenantPipelineStatus } from "@/lib/tenant-pipeline-status";
import { isTenancyInAgreementSetup } from "@/server/repositories/tenancies.repository";
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
import {
  getCurrentTenantActiveTenancy,
  getCurrentTenantSetupTenancy,
} from "@/server/services/tenancies.service";
import { getCurrentLandlordQuitNoticesForTenancy } from "@/server/services/quit-notices.service";
import { getCurrentLandlordTenantAgentCommissionAmount } from "@/server/services/tenant-agent-commission.service";
import { getCurrentLandlordBankSetup } from "@/server/services/landlord-bank.service";
import {
  getLandlordPaymentGateUiState,
  getPaystackPayoutVerificationUiState,
} from "@/server/services/paystack-verification.service";

type TenantDetailPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    step?: string;
  }>;
};

function sumCharges(
  charges: Awaited<ReturnType<typeof getLandlordChargesForCurrentLandlord>>,
) {
  return charges.reduce((total, charge) => total + Number(charge.amount), 0);
}

function resolveAgreementStep(params: {
  requestedStep: string | undefined;
  isTenantApproved: boolean;
  setupTenancy: Awaited<ReturnType<typeof getCurrentTenantSetupTenancy>>;
  agreementDocument: Awaited<
    ReturnType<typeof getCurrentTenancyAgreementByTenancyId>
  >;
}) {
  if (params.agreementDocument) {
    return "agreement";
  }

  if (
    params.setupTenancy &&
    isTenancyInAgreementSetup(params.setupTenancy) &&
    params.setupTenancy.charges_confirmed_at
  ) {
    return params.requestedStep === "charges"
      ? "charges"
      : "agreement-draft";
  }

  if (
    params.setupTenancy &&
    isTenancyInAgreementSetup(params.setupTenancy)
  ) {
    return "charges";
  }

  if (params.isTenantApproved && !params.setupTenancy) {
    return "agreement-setup";
  }

  return null;
}

export default async function TenantDetailPage({
  params,
  searchParams,
}: TenantDetailPageProps) {
  const { tenantId } = await params;
  const { step } = await searchParams;

  const [tenant, guarantor, kycDocuments, setupTenancy, ledgerSummary] =
    await Promise.all([
      getCurrentLandlordTenant(tenantId),
      getCurrentLandlordTenantGuarantor(tenantId),
      getCurrentLandlordTenantKycDocumentLinks(tenantId),
      getCurrentTenantSetupTenancy(tenantId),
      getCurrentTenantLedgerSummary(tenantId),
    ]);

  const activeTenancy =
    setupTenancy && !isTenancyInAgreementSetup(setupTenancy)
      ? setupTenancy
      : await getCurrentTenantActiveTenancy(tenantId);

  const agreementDocument = setupTenancy
    ? await getCurrentTenancyAgreementByTenancyId(setupTenancy.id)
    : null;

  const agreementPdfDownloadUrl = agreementDocument?.pdf_path
    ? await getCurrentTenancyAgreementPdfDownloadUrl(agreementDocument.id)
    : null;

  const quitNotices = activeTenancy
    ? await getCurrentLandlordQuitNoticesForTenancy(activeTenancy.id)
    : [];

  const landlordCharges = setupTenancy
    ? await getLandlordChargesForCurrentLandlord(setupTenancy.id)
    : [];

  const landlordChargesAmount = sumCharges(landlordCharges);

  const agentCommissionAmount =
    await getCurrentLandlordTenantAgentCommissionAmount(tenant.id);
  const payoutAccount = await getCurrentLandlordBankSetup();
  const payoutVerification = getPaystackPayoutVerificationUiState(
    payoutAccount,
    "landlord",
  );
  const paymentGate = getLandlordPaymentGateUiState(payoutAccount);

  const tenuroFeeAmount = Number(
    process.env.TENURO_GATEWAY_ADMIN_FEE_NAIRA ?? 0,
  );

  const pipelineStatus = resolveTenantPipelineStatus({
    onboardingStatus: tenant.onboarding_status,
    isAgreementSetup: setupTenancy
      ? isTenancyInAgreementSetup(setupTenancy)
      : false,
    isOperationallyLive: setupTenancy
      ? !isTenancyInAgreementSetup(setupTenancy)
      : Boolean(activeTenancy),
    chargesConfirmed: Boolean(setupTenancy?.charges_confirmed_at),
    agreementDocumentStatus: agreementDocument?.document_status ?? null,
  });

  const outstandingBalance = ledgerSummary.balance?.outstanding_balance ?? 0;
  const hasOutstandingBalance = Boolean(
    ledgerSummary.balance && outstandingBalance > 0,
  );

  const isAgreementAccepted = agreementDocument?.document_status === "accepted";
  const isTenantApproved = tenant.onboarding_status === "approved";
  const isRentSettled = Boolean(
    ledgerSummary.balance && outstandingBalance <= 0,
  );

  const hasPaymentLinkPrerequisites = Boolean(
    activeTenancy && hasOutstandingBalance && isAgreementAccepted,
  );
  const canSendPaymentLink =
    hasPaymentLinkPrerequisites && payoutVerification.isVerified;

  const shouldShowPaymentLockedNotice = Boolean(
    activeTenancy && hasOutstandingBalance && !isAgreementAccepted,
  );

  const canCreateTenancyRecord = isTenantApproved && !setupTenancy;
  const agreementStep = resolveAgreementStep({
    requestedStep: step,
    isTenantApproved,
    setupTenancy,
    agreementDocument,
  });

  const shouldShowKycReview =
    tenant.onboarding_status === "profile_complete" ||
    tenant.onboarding_status === "rejected";

  const canIssueQuitNotice = Boolean(
    activeTenancy && activeTenancy.tenancy_status === "active",
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
      ? "Review the tenant KYC submission and approve the tenant to start agreement setup."
      : !isTenantApproved
        ? "Send the tenant onboarding link so they can complete their profile, ID document, and guarantor details."
        : agreementStep === "agreement-setup"
          ? "Confirm rent, tenancy dates, and renewal reminder interval to begin agreement setup."
          : agreementStep === "charges"
            ? "Add landlord charges, review the running total, and confirm before generating the agreement."
            : agreementStep === "agreement-draft"
              ? "Review the agreement draft preview and generate the tenancy agreement document."
              : !agreementDocument
                ? "Generate the tenancy agreement draft before sending it to the tenant."
                : !isAgreementAccepted
                  ? "Send the agreement acceptance link to the tenant."
                  : hasOutstandingBalance
                    ? payoutVerification.isVerified
                      ? "Send the tenant rent payment link before account activation."
                      : paymentGate?.description ??
                        "Online rent payment links are unavailable until payout verification is approved. You can still record manual payments."
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
        action={<Badge tone={pipelineStatus.tone}>{pipelineStatus.label}</Badge>}
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

          {shouldShowKycReview ? (
            <TenantReviewCard
              tenant={tenant}
              guarantor={guarantor}
              documents={kycDocuments}
            />
          ) : isTenantApproved ? (
            <SectionCard
              title="Tenant Approved"
              description="KYC review is complete. Continue with agreement setup below."
            >
              <TrustNotice
                title="Approval confirmed"
                description="The tenant profile, documents, and guarantor details were approved. Agreement setup is now unlocked."
                icon={
                  <FileCheck2 aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </SectionCard>
          ) : null}

          {canCreateTenancyRecord && agreementStep === "agreement-setup" ? (
            <div id="agreement-setup">
              <SectionCard
                title="Create Tenancy and Agreement Setup"
                description="Confirm rent, tenancy dates, renewal reminder interval, and agreement notes."
              >
              <TrustNotice
                title="Landlord confirmation required"
                description="The tenant has been approved. Confirm the tenancy terms before adding landlord charges and generating the agreement."
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
            </div>
          ) : null}

          {setupTenancy && agreementStep === "charges" ? (
            <>
              <TenancySummaryCard tenancy={setupTenancy} />

              <div id="charges">
                <SectionCard
                  title="Review Landlord Charges"
                  description="Add move-in charges, review the running total, remove any mistakes, then confirm to continue."
                >
                <LandlordTenancyChargePanel
                  tenancyId={setupTenancy.id}
                  charges={landlordCharges}
                  chargesConfirmed={Boolean(setupTenancy.charges_confirmed_at)}
                />
              </SectionCard>
              </div>
            </>
          ) : null}

          {setupTenancy && agreementStep === "agreement-draft" ? (
            <AgreementDraftPreview
              tenancy={setupTenancy}
              charges={landlordCharges}
            />
          ) : null}

          {setupTenancy && agreementStep === "agreement" ? (
            <>
              <TenancySummaryCard tenancy={setupTenancy} />

              <SectionCard
                title="Landlord Charges"
                description="Confirmed landlord charges included in this tenancy."
              >
                <LandlordTenancyChargeList
                  tenancyId={setupTenancy.id}
                  charges={landlordCharges}
                  chargesConfirmed
                />
              </SectionCard>

              <TenancyAgreementDocumentCard
                tenancyId={setupTenancy.id}
                agreement={agreementDocument}
                pdfDownloadUrl={agreementPdfDownloadUrl}
              />
            </>
          ) : null}

          {!setupTenancy && !isTenantApproved ? (
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

          {hasPaymentLinkPrerequisites && paymentGate ? (
            <SectionCard
              title="Online Payment Link Unavailable"
              description="Manual rent recording is still available. Online Paystack rent collection depends on payout verification."
              action={
                <Badge tone={payoutVerification.badgeTone}>
                  {payoutVerification.badgeLabel}
                </Badge>
              }
            >
              <PayoutPaymentGateNotice gate={paymentGate} />
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
