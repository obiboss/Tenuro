import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  Home,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { TenantOnboardingForm } from "@/components/tenant/tenant-onboarding-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  resolveAgentTenantProcessingFeeForOnboarding,
  verifyAgentTenantProcessingFeeReference,
} from "@/server/services/agent-processing-fee.service";
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
        ReturnType<typeof resolveAgentTenantProcessingFeeForOnboarding>
      >;
      processingFeeNotice: string | null;
    }
  | {
      ok: false;
      message: string;
    };

async function getTenantOnboardingPageState(params: {
  token: string;
  shouldVerifyProcessingFee: boolean;
  processingFeeReference: string | undefined;
}): Promise<TenantOnboardingPageState> {
  try {
    let processingFeeNotice: string | null = null;

    if (params.shouldVerifyProcessingFee && params.processingFeeReference) {
      try {
        await verifyAgentTenantProcessingFeeReference(
          params.processingFeeReference,
        );

        processingFeeNotice =
          "Processing fee payment confirmed. You can now complete your KYC form.";
      } catch (error) {
        processingFeeNotice =
          error instanceof Error
            ? error.message
            : "Processing fee payment could not be verified.";
      }
    }

    const tenant = await resolveTenantOnboardingToken(params.token);

    const processingFee = await resolveAgentTenantProcessingFeeForOnboarding({
      tenant,
      token: params.token,
    });

    return {
      ok: true,
      tenant,
      processingFee,
      processingFeeNotice,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This onboarding link could not be opened.",
    };
  }
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
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
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

function ProcessingFeeGate({
  authorizationUrl,
  processingFeeAmount,
  agentShareAmount,
  tenuroShareAmount,
  currencyCode,
  notice,
}: {
  authorizationUrl: string;
  processingFeeAmount: number;
  agentShareAmount: number;
  tenuroShareAmount: number;
  currencyCode: string;
  notice: string | null;
}) {
  return (
    <SectionCard
      title="Pay tenant processing fee"
      description="This apartment was introduced by an agent. Pay the processing fee first, then the KYC form will open automatically."
    >
      <div className="space-y-5">
        {notice ? (
          <div
            role="alert"
            className="rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning"
          >
            {notice}
          </div>
        ) : null}

        <TrustNotice
          title="Processing fee required before KYC"
          description="This ₦15,000 processing fee is separate from your rent. The agent receives ₦10,000 and BOPA receives ₦5,000."
          icon={<ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Total fee</p>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatMoney(processingFeeAmount, currencyCode)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Agent receives</p>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatMoney(agentShareAmount, currencyCode)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">BOPA receives</p>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatMoney(tenuroShareAmount, currencyCode)}
            </p>
          </div>
        </div>

        <Link href={authorizationUrl}>
          <Button type="button" fullWidth>
            Pay Processing Fee
          </Button>
        </Link>
      </div>
    </SectionCard>
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
  const isSubmitted = tenant.onboarding_status === "profile_complete";
  const mustPayProcessingFee =
    state.processingFee.required && state.processingFee.status !== "paid";

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
          <TenantOnboardingLogo />

          <PageHeader
            title={
              isSubmitted
                ? "Tenant profile submitted"
                : mustPayProcessingFee
                  ? "Pay processing fee"
                  : "Complete your tenant profile"
            }
            description={
              isSubmitted
                ? "Your profile has been submitted for landlord review."
                : mustPayProcessingFee
                  ? "Pay the agent processing fee to unlock your tenant KYC form."
                  : "Review the rental details and complete your KYC information for the landlord’s approval."
            }
            action={
              <Badge
                tone={
                  isSubmitted
                    ? "success"
                    : mustPayProcessingFee
                      ? "warning"
                      : "primary"
                }
              >
                {isSubmitted
                  ? "Submitted"
                  : mustPayProcessingFee
                    ? "Payment Required"
                    : "Secure Link"}
              </Badge>
            }
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

              {mustPayProcessingFee ? (
                <ProcessingFeeGate
                  authorizationUrl={state.processingFee.authorizationUrl ?? "#"}
                  processingFeeAmount={state.processingFee.processingFeeAmount}
                  agentShareAmount={state.processingFee.agentShareAmount}
                  tenuroShareAmount={state.processingFee.tenuroShareAmount}
                  currencyCode={state.processingFee.currencyCode}
                  notice={state.processingFeeNotice}
                />
              ) : (
                <SectionCard
                  title="Tenant KYC Form"
                  description="Complete your personal details, ID document, and passport photo for landlord review."
                >
                  {state.processingFeeNotice ? (
                    <div
                      role="alert"
                      className="mb-4 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success"
                    >
                      {state.processingFeeNotice}
                    </div>
                  ) : null}

                  <TenantOnboardingForm
                    token={token}
                    fullName={tenant.full_name}
                    phoneNumber={tenant.phone_number}
                    email={tenant.email}
                    isSubmitted={isSubmitted}
                    propertyRules={tenant.property_rules}
                  />
                </SectionCard>
              )}
            </div>

            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <TrustNotice
                title="Secure onboarding"
                description="This link was created for you and expires automatically. Do not share it with anyone else."
              />

              {state.processingFee.required ? (
                <TrustNotice
                  title="Agent processing fee"
                  description="This fee is required before KYC because this apartment was introduced through an agent."
                  icon={
                    <CreditCard
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
