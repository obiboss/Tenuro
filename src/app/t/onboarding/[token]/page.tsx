import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Home,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { TenantOnboardingForm } from "@/components/tenant/tenant-onboarding-form";
import { VerificationProcessingSummary } from "@/components/tenant/verification-processing-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  isAgentSourcedTenant,
  isOnboardingDraftStatus,
  isSubmittedForLandlordReview,
} from "@/server/constants/onboarding-lifecycle";
import { errorResult } from "@/server/errors/result";
import {
  getDirectLandlordTenantProcessingFeeState,
  safeResolveTenantProcessingFeeForOnboarding,
  verifyTenantProcessingFeeReference,
} from "@/server/services/tenant-verification-processing-fee.service";
import { resolveTenantOnboardingToken } from "@/server/services/onboarding.service";

type TenantOnboardingPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    verifyProcessingFee?: string;
    reference?: string;
  }>;
};

type TenantOnboardingPageState =
  | {
      ok: true;
      tenant: Awaited<ReturnType<typeof resolveTenantOnboardingToken>>;
      processingFee: Awaited<
        ReturnType<typeof safeResolveTenantProcessingFeeForOnboarding>
      >["processingFee"];
      processingFeeNotice: string | null;
      paymentInitError: string | null;
    }
  | {
      ok: false;
      message: string;
    };

type TenantProcessingFeeState = Awaited<
  ReturnType<typeof safeResolveTenantProcessingFeeForOnboarding>
>["processingFee"];

async function getTenantOnboardingPageState(params: {
  token: string;
  shouldVerifyProcessingFee: boolean;
  processingFeeReference: string | undefined;
}): Promise<TenantOnboardingPageState> {
  let tenant: Awaited<ReturnType<typeof resolveTenantOnboardingToken>>;

  try {
    tenant = await resolveTenantOnboardingToken(params.token);
  } catch (error) {
    return {
      ok: false,
      message: errorResult(error).message,
    };
  }

  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  let processingFeeNotice: string | null = null;
  let processingFee: TenantProcessingFeeState =
    getDirectLandlordTenantProcessingFeeState();
  let paymentInitError: string | null = null;

  if (agentSourced) {
    if (params.shouldVerifyProcessingFee && params.processingFeeReference) {
      try {
        await verifyTenantProcessingFeeReference(params.processingFeeReference);

        processingFeeNotice =
          "Verification fee payment confirmed. Your application has been submitted for landlord review.";
      } catch (error) {
        processingFeeNotice = errorResult(error).message;
      }
    }

    const resolvedProcessingFee =
      await safeResolveTenantProcessingFeeForOnboarding({
        tenant,
        token: params.token,
      });

    processingFee = resolvedProcessingFee.processingFee;
    paymentInitError = resolvedProcessingFee.paymentInitError;
  }

  return {
    ok: true,
    tenant,
    processingFee,
    processingFeeNotice,
    paymentInitError,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(amount: number | null, currencyCode: string) {
  if (amount === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TenantOnboardingLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Tenant onboarding
        </p>
      </div>
    </Link>
  );
}

function OnboardingUnavailable({ message }: { message: string }) {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <TenantOnboardingLogo />

          <SectionCard
            title="Onboarding link unavailable"
            description="We could not open this tenant onboarding link."
          >
            <TrustNotice
              title="Please request a new link"
              description={message}
              icon={
                <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
              }
            />
          </SectionCard>
        </section>
      </main>
    </ToastProvider>
  );
}

export default async function TenantOnboardingPage({
  params,
  searchParams,
}: TenantOnboardingPageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const state = await getTenantOnboardingPageState({
    token,
    shouldVerifyProcessingFee: resolvedSearchParams.verifyProcessingFee === "1",
    processingFeeReference: resolvedSearchParams.reference,
  });

  if (!state.ok) {
    return <OnboardingUnavailable message={state.message} />;
  }

  const tenant = state.tenant;
  const unit = tenant.units;
  const property = unit?.properties;
  const landlord = tenant.profiles;

  const agentSourced = isAgentSourcedTenant({
    agentPropertyListingId: tenant.agent_property_listing_id,
    invitedByAgentId: tenant.invited_by_agent_id,
  });

  const isDraftSaved = isOnboardingDraftStatus(tenant.onboarding_status);
  const isOfficiallySubmitted = isSubmittedForLandlordReview(
    tenant.onboarding_status,
  );

  const shouldShowAgentVerificationSummary =
    agentSourced &&
    (isDraftSaved ||
      state.processingFee.status === "paid" ||
      state.processingFee.status === "initialized" ||
      state.processingFee.status === "disabled" ||
      state.processingFee.status === "payment_unavailable");

  const pageTitle = isOfficiallySubmitted
    ? "Application submitted"
    : shouldShowAgentVerificationSummary
      ? "Verification & Processing Summary"
      : "Complete your tenant profile";

  const pageDescription = isOfficiallySubmitted
    ? "Your application has been submitted for landlord review."
    : shouldShowAgentVerificationSummary
      ? "Complete the agent processing fee to submit your application for landlord review."
      : "Review the rental details and complete your KYC information. After you submit, your details will be sent to the landlord for review.";

  const badgeLabel = isOfficiallySubmitted
    ? "Submitted"
    : shouldShowAgentVerificationSummary
      ? "Agent Fee Required"
      : "Secure Link";

  const badgeTone = isOfficiallySubmitted
    ? "success"
    : shouldShowAgentVerificationSummary
      ? "warning"
      : "primary";

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
          <TenantOnboardingLogo />

          <PageHeader
            title={pageTitle}
            description={pageDescription}
            action={<Badge tone={badgeTone}>{badgeLabel}</Badge>}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-button bg-background p-4">
                      <div className="flex items-center gap-2 text-text-muted">
                        <UserRound
                          aria-hidden="true"
                          size={18}
                          strokeWidth={2.5}
                        />
                        <p className="text-sm font-bold">Name</p>
                      </div>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {tenant.full_name}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-4">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Phone aria-hidden="true" size={18} strokeWidth={2.5} />
                        <p className="text-sm font-bold">Phone</p>
                      </div>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {tenant.phone_number}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Apartment Details</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-button bg-background p-4">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Home aria-hidden="true" size={18} strokeWidth={2.5} />
                        <p className="text-sm font-bold">Property</p>
                      </div>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {property?.property_name ?? "Not available"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {property?.address ?? "Address not available"}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-4">
                      <p className="text-sm font-bold text-text-muted">Unit</p>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {unit?.unit_identifier ?? "Not available"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        Annual rent:{" "}
                        {formatMoney(
                          unit?.annual_rent ?? null,
                          unit?.currency_code ?? "NGN",
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {shouldShowAgentVerificationSummary ? (
                <VerificationProcessingSummary
                  fullName={tenant.full_name}
                  phoneNumber={tenant.phone_number}
                  email={tenant.email}
                  occupation={tenant.occupation}
                  homeAddress={tenant.home_address}
                  propertyName={property?.property_name ?? "Not available"}
                  unitIdentifier={unit?.unit_identifier ?? "Not available"}
                  processingFeeAmount={state.processingFee.processingFeeAmount}
                  currencyCode={state.processingFee.currencyCode}
                  authorizationUrl={state.processingFee.authorizationUrl}
                  paymentNotice={state.processingFeeNotice}
                  paymentError={state.paymentInitError}
                  isOfficiallySubmitted={isOfficiallySubmitted}
                  isPaymentDisabled={
                    state.processingFee.status === "disabled" ||
                    state.processingFee.status === "payment_unavailable"
                  }
                />
              ) : isOfficiallySubmitted ? (
                <SectionCard
                  title="Application submitted"
                  description="Your tenant profile has been submitted for landlord review."
                >
                  <TrustNotice
                    title="Submitted for review"
                    description="The landlord will review your details and contact you with the next step."
                  />
                </SectionCard>
              ) : (
                <SectionCard
                  title="Tenant KYC Form"
                  description="Complete your personal details, ID document, and passport photo. After you submit, your details will be sent to the landlord for review."
                >
                  <TenantOnboardingForm
                    token={token}
                    fullName={tenant.full_name}
                    phoneNumber={tenant.phone_number}
                    email={tenant.email}
                    isSubmitted={false}
                    propertyRules={tenant.property_rules}
                    isAgentSourced={agentSourced}
                    requiresVerificationSummary={agentSourced}
                  />
                </SectionCard>
              )}
            </div>

            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <TrustNotice
                title="Secure onboarding"
                description="This link was created for you and expires automatically. Do not share it with anyone else."
              />

              {shouldShowAgentVerificationSummary ? (
                <TrustNotice
                  title="Agent processing"
                  description="The processing fee applies only because this application came through an agent. It does not guarantee tenancy approval."
                  icon={
                    <ShieldCheck
                      aria-hidden="true"
                      size={22}
                      strokeWidth={2.6}
                    />
                  }
                />
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Invitation Details</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-button bg-background p-4">
                      <p className="text-sm font-bold text-text-muted">
                        Landlord
                      </p>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {landlord?.full_name ?? "Landlord"}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-4">
                      <div className="flex items-center gap-2 text-text-muted">
                        <CalendarClock
                          aria-hidden="true"
                          size={18}
                          strokeWidth={2.5}
                        />
                        <p className="text-sm font-bold">Expires</p>
                      </div>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {formatDate(tenant.onboarding_token_expires_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}
