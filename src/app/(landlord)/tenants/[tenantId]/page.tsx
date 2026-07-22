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
import { RequestPaymentProofPanel } from "@/components/caretaker/request-payment-proof-panel";
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
import { RENT_PAYMENT_FREQUENCY_LABELS } from "@/lib/rent-cycle";
import {
  isSubmittedForLandlordReview,
  TENANT_ONBOARDING_STATUSES,
} from "@/server/constants/onboarding-lifecycle";
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

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getExistingTenantClaimId(
  answers: Record<string, unknown> | null | undefined,
) {
  if (!answers) {
    return null;
  }

  const value =
    answers.existing_tenant_claim_id ??
    answers.source_existing_tenant_claim_id;

  return typeof value === "string" && value.trim() ? value : null;
}

function isExistingTenantRecord(
  answers: Record<string, unknown> | null | undefined,
) {
  return Boolean(
    answers?.source === "existing_tenant_claim" ||
      getExistingTenantClaimId(answers),
  );
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
    return params.requestedStep === "charges" ? "charges" : "agreement-draft";
  }

  if (params.setupTenancy && isTenancyInAgreementSetup(params.setupTenancy)) {
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
  const existingTenantRecord = isExistingTenantRecord(tenant.kyc_answers);
  const existingTenantClaimId = getExistingTenantClaimId(tenant.kyc_answers);

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
  const agreementRequirementSatisfied =
    existingTenantRecord || isAgreementAccepted;
  const isTenantApproved = tenant.onboarding_status === "approved";
  const isRentSettled = Boolean(
    ledgerSummary.balance && outstandingBalance <= 0,
  );

  const hasPaymentLinkPrerequisites = Boolean(
    activeTenancy && hasOutstandingBalance && agreementRequirementSatisfied,
  );
  const canSendPaymentLink =
    hasPaymentLinkPrerequisites && payoutVerification.isVerified;

  const shouldShowPaymentLockedNotice = Boolean(
    activeTenancy &&
      hasOutstandingBalance &&
      !agreementRequirementSatisfied &&
      !existingTenantRecord,
  );

  const canCreateTenancyRecord =
    isTenantApproved && !setupTenancy && !existingTenantRecord;
  const agreementStep = existingTenantRecord
    ? null
    : resolveAgreementStep({
        requestedStep: step,
        isTenantApproved,
        setupTenancy,
        agreementDocument,
      });

  const shouldShowKycReview =
    isSubmittedForLandlordReview(tenant.onboarding_status) ||
    tenant.onboarding_status === TENANT_ONBOARDING_STATUSES.waitlisted ||
    tenant.onboarding_status === TENANT_ONBOARDING_STATUSES.rejected;

  const canIssueQuitNotice = Boolean(
    activeTenancy && activeTenancy.tenancy_status === "active",
  );

  const shouldShowOnboardingCard =
    tenant.onboarding_status === "invited" ||
    tenant.onboarding_status === "rejected";

  const shouldShowActivationCard = Boolean(
    isTenantApproved &&
    activeTenancy &&
    agreementRequirementSatisfied &&
    isRentSettled &&
    !tenant.profile_id,
  );

  const nextStepDescription = tenant.profile_id
    ? "This tenant already has an active tenant account."
    : isSubmittedForLandlordReview(tenant.onboarding_status)
      ? "Review the tenant KYC submission and approve the tenant to start agreement setup."
      : tenant.onboarding_status ===
          TENANT_ONBOARDING_STATUSES.documentsSubmitted
        ? "The tenant has saved their application and must complete verification payment before you can review."
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
                        : (paymentGate?.description ??
                          "Online rent payment links are unavailable until payout verification is approved. You can still record manual payments.")
                      : "Send the tenant activation link so they can set their password and access their dashboard.";

  if (existingTenantRecord) {
    if (!activeTenancy) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href="/tenants"
            className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
          >
            <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
            Back to tenants
          </Link>

          <PageHeader
            title={tenant.full_name}
            description={`${tenant.units?.properties?.property_name ?? "Property"} · ${tenant.units?.unit_identifier ?? "Unit"}`}
            action={<Badge tone="warning">Record incomplete</Badge>}
          />

          <SectionCard
            title="Complete existing tenant record"
            description="This tenant already lives in the unit. Confirm the rent history to activate the tenancy record; a new agreement is not required."
          >
            {existingTenantClaimId ? (
              <Link
                href={`/existing-tenant-claims/${existingTenantClaimId}`}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
              >
                Continue existing tenant setup
              </Link>
            ) : (
              <TrustNotice
                title="Existing tenant record needs attention"
                description="Return to the existing tenant review list and complete the saved rent history."
              />
            )}
          </SectionCard>
        </div>
      );
    }

    const frequencyLabel =
      RENT_PAYMENT_FREQUENCY_LABELS[activeTenancy.payment_frequency];
    const rentDueDate = hasOutstandingBalance
      ? activeTenancy.current_period_start
      : (activeTenancy.next_rent_charge_date);

    return (
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/tenants"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to tenants
        </Link>

        <PageHeader
          title={tenant.full_name}
          description={`${tenant.units?.properties?.property_name ?? "Property"} · ${tenant.units?.unit_identifier ?? "Unit"}`}
          action={<Badge tone="success">Current tenant</Badge>}
        />

        <div className="space-y-5">
          <SectionCard
            title="Rent position"
            description="This existing tenant is active. No new agreement is required."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Unit rent</p>
                <p className="mt-1 text-lg font-black text-text-strong">
                  {formatNaira(Number(activeTenancy.rent_amount))}
                </p>
              </div>
              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Rent collection</p>
                <p className="mt-1 text-lg font-black text-text-strong">
                  {frequencyLabel}
                </p>
              </div>
              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Original move-in date</p>
                <p className="mt-1 text-lg font-black text-text-strong">
                  {formatDate(activeTenancy.start_date)}
                </p>
              </div>
              <div className="rounded-button bg-background p-4">
                <p className="text-sm font-bold text-text-muted">Rent due date</p>
                <p className="mt-1 text-lg font-black text-text-strong">
                  {formatDate(rentDueDate)}
                </p>
              </div>
            </div>

            <div
              className={`mt-3 rounded-button p-4 ${
                hasOutstandingBalance ? "bg-danger-soft" : "bg-success-soft"
              }`}
            >
              <p className="text-sm font-bold text-text-muted">Amount owed</p>
              <p
                className={`mt-1 text-xl font-black ${
                  hasOutstandingBalance ? "text-danger" : "text-success"
                }`}
              >
                {formatNaira(outstandingBalance)}
              </p>
            </div>
          </SectionCard>

          {canSendPaymentLink && activeTenancy ? (
            <SectionCard
              title="Collect outstanding rent"
              description="Send the tenant a secure rent payment link."
            >
              <RentPaymentModal
                tenancyId={activeTenancy.id}
                defaultAmount={outstandingBalance}
                landlordChargesAmount={0}
                agentCommissionAmount={agentCommissionAmount}
                tenuroFeeAmount={tenuroFeeAmount}
                periodStart={activeTenancy.current_period_start}
                periodEnd={activeTenancy.current_period_end}
              />
            </SectionCard>
          ) : null}

          {hasPaymentLinkPrerequisites && paymentGate ? (
            <SectionCard
              title="Online payment link unavailable"
              description="You can still record a bank transfer or cash payment."
              action={
                <Badge tone={payoutVerification.badgeTone}>
                  {payoutVerification.badgeLabel}
                </Badge>
              }
            >
              <PayoutPaymentGateNotice gate={paymentGate} />
            </SectionCard>
          ) : null}

          {shouldShowActivationCard ? (
            <TenantActivationInviteCard tenantId={tenant.id} />
          ) : null}

          <details className="rounded-card border border-border-soft bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-primary">
              View tenant details and more actions
            </summary>

            <div className="space-y-5 border-t border-border-soft p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Phone number</p>
                  <p className="mt-1 font-black text-text-strong">
                    {tenant.phone_number}
                  </p>
                </div>
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Occupation</p>
                  <p className="mt-1 font-black text-text-strong">
                    {tenant.occupation || "Not provided"}
                  </p>
                </div>
              </div>

              <TrustNotice
                title="Agreement is optional"
                description="Create a new agreement later only when the tenancy terms change or when both parties want one at renewal."
              />

              <RequestPaymentProofPanel
                requester="landlord"
                tenancyId={activeTenancy.id}
                tenantName={tenant.full_name}
                tenantPhone={tenant.phone_number}
                propertyUnitLabel={`${tenant.units?.properties?.property_name ?? "Property"} · ${tenant.units?.unit_identifier ?? "Unit"}`}
                rentAmount={Number(activeTenancy.rent_amount)}
              />

              {canIssueQuitNotice ? (
                <QuitNoticeIssueCard
                  tenantId={tenant.id}
                  tenancyId={activeTenancy.id}
                />
              ) : null}

              <MoveOutConfirmationCard
                tenantId={tenant.id}
                notices={quitNotices}
              />

              {tenant.landlord_notes ? (
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Private note</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-normal">
                    {tenant.landlord_notes}
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    );
  }

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
        description={`${tenant.units?.properties?.property_name ?? "Property"} · ${tenant.units?.unit_identifier ?? "Unit"}`}
        action={
          <Badge tone={pipelineStatus.tone}>{pipelineStatus.label}</Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant details</CardTitle>
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
              title="Tenant accepted"
              description="The tenant’s details have been accepted. Continue with the agreement below."
            >
              <TrustNotice
                title="Tenant details accepted"
                description="You can now confirm the rent details and prepare the tenancy agreement."
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
                    rentAmount={tenant.units?.rent_amount ?? 0}
                    rentFrequency={tenant.units?.rent_frequency ?? "annual"}
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
                    chargesConfirmed={Boolean(
                      setupTenancy.charges_confirmed_at,
                    )}
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

          {activeTenancy ? (
            <SectionCard
              title="Payment made outside BOPA?"
              description="Use this when the tenant paid by bank transfer, cash, or another method outside the app."
            >
              <RequestPaymentProofPanel
                requester="landlord"
                tenancyId={activeTenancy.id}
                tenantName={tenant.full_name}
                tenantPhone={tenant.phone_number}
                propertyUnitLabel={`${tenant.units?.properties?.property_name ?? "Property"} · ${tenant.units?.unit_identifier ?? "Unit"}`}
                rentAmount={Number(activeTenancy.rent_amount)}
              />
            </SectionCard>
          ) : null}

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
