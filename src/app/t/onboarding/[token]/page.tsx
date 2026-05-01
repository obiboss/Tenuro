import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Home,
  Phone,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { resolveTenantOnboardingToken } from "@/server/services/onboarding.service";

type TenantOnboardingPageProps = {
  params: Promise<{
    token: string;
  }>;
};

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

export default async function TenantOnboardingPage({
  params,
}: TenantOnboardingPageProps) {
  const { token } = await params;

  try {
    const tenant = await resolveTenantOnboardingToken(token);
    const unit = tenant.units;
    const property = unit?.properties;
    const landlord = tenant.profiles;

    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
          <Link href="/" className="mb-8 flex w-fit items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Tenant onboarding
              </p>
            </div>
          </Link>

          <PageHeader
            title="Complete your tenant profile"
            description="Review the rental details and prepare your KYC information for the landlord’s approval."
            action={<Badge tone="primary">Secure Link</Badge>}
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

              <SectionCard
                title="KYC form"
                description="The full tenant KYC form will collect your address, occupation, ID details, passport photo, and guarantor information."
              >
                <TrustNotice
                  title="Form activation is next"
                  description="Your secure link is valid. The next setup step enables the full submission form with encrypted ID storage and guarantor details."
                  icon={
                    <CheckCircle2
                      aria-hidden="true"
                      size={22}
                      strokeWidth={2.6}
                    />
                  }
                />
              </SectionCard>
            </div>

            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <TrustNotice
                title="Secure onboarding"
                description="This link was created by your landlord and expires automatically. Do not share it with anyone else."
              />

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
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "This onboarding link could not be opened.";

    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <Link href="/" className="mb-8 flex w-fit items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Tenant onboarding
              </p>
            </div>
          </Link>

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
    );
  }
}
