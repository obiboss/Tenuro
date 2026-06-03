import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Home,
  UserRoundCheck,
} from "lucide-react";
import { ExistingTenantClaimPublicForm } from "@/components/tenant/existing-tenant-claim-public-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import { errorResult } from "@/server/errors/result";
import { resolveExistingTenantClaimToken } from "@/server/services/existing-tenant-claims.service";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantClaimPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type ExistingTenantClaimPublicPageState =
  | {
      ok: true;
      claim: Awaited<ReturnType<typeof resolveExistingTenantClaimToken>>;
    }
  | {
      ok: false;
      message: string;
    };

async function getExistingTenantClaimPageState(
  token: string,
): Promise<ExistingTenantClaimPublicPageState> {
  try {
    const claim = await resolveExistingTenantClaimToken(token);

    return {
      ok: true,
      claim,
    };
  } catch (error) {
    return {
      ok: false,
      message: errorResult(error).message,
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

function ExistingTenantClaimLogo() {
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
          Confirm tenancy details
        </p>
      </div>
    </Link>
  );
}

function ClaimUnavailable({ message }: { message: string }) {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <ExistingTenantClaimLogo />

          <SectionCard
            title="Claim link unavailable"
            description="We could not open this existing tenant claim link."
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

export default async function ExistingTenantClaimPage({
  params,
}: ExistingTenantClaimPageProps) {
  const { token } = await params;
  const state = await getExistingTenantClaimPageState(token);

  if (!state.ok) {
    return <ClaimUnavailable message={state.message} />;
  }

  const claim = state.claim;
  const unit = claim.units;
  const property = unit?.properties;
  const isSubmitted =
    claim.status === "submitted" ||
    claim.status === "approved" ||
    claim.status === "rejected";

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
          <ExistingTenantClaimLogo />

          <PageHeader
            title={
              isSubmitted
                ? "Tenancy details submitted"
                : "Confirm your tenancy details"
            }
            description={
              isSubmitted
                ? "Your landlord will review the details before confirming the tenancy record."
                : "Your landlord invited you to confirm your tenancy details for BOPA records."
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
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
                        {property?.property_name ?? "Property"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {property?.address ?? "Address not available"}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-4">
                      <p className="text-sm font-bold text-text-muted">Unit</p>

                      <p className="mt-2 font-extrabold text-text-strong">
                        {unit?.unit_identifier ?? "Unit"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        Current listed rent:{" "}
                        {formatNaira(Number(unit?.annual_rent ?? 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <SectionCard
                title={
                  isSubmitted
                    ? "Submitted for landlord review"
                    : "Your Tenancy Details"
                }
                description={
                  isSubmitted
                    ? "No further action is needed on this link."
                    : "Enter the details as you understand them. Your landlord can correct the rent amount or due date during review."
                }
              >
                {isSubmitted ? (
                  <TrustNotice
                    title="Submitted"
                    description="The landlord will review and confirm the final rent amount, move-in date, and rent due date."
                  />
                ) : (
                  <ExistingTenantClaimPublicForm
                    token={token}
                    invitedName={claim.invited_tenant_full_name}
                    invitedPhoneNumber={claim.invited_tenant_phone_number}
                    invitedEmail={claim.invited_tenant_email}
                  />
                )}
              </SectionCard>
            </div>

            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <TrustNotice
                title="Landlord review required"
                description="Your submitted rent amount and due date are not final until the landlord approves them."
                icon={
                  <UserRoundCheck
                    aria-hidden="true"
                    size={22}
                    strokeWidth={2.6}
                  />
                }
              />

              <Card>
                <CardHeader>
                  <CardTitle>Link Details</CardTitle>
                </CardHeader>

                <CardContent>
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
                      {formatDate(claim.token_expires_at)}
                    </p>
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
