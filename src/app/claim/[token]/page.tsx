import {
  AlertTriangle,
  CalendarClock,
  Home,
} from "lucide-react";
import { ExistingTenantClaimPublicForm } from "@/components/tenant/existing-tenant-claim-public-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import { errorResult } from "@/server/errors/result";
import { resolveExistingTenantClaimToken } from "@/server/services/existing-tenant-claims.service";
import { formatNaira } from "@/server/utils/money";

type ClaimPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type ClaimPageState =
  | {
      ok: true;
      claim: Awaited<ReturnType<typeof resolveExistingTenantClaimToken>>;
    }
  | {
      ok: false;
      message: string;
    };

async function getClaimPageState(token: string): Promise<ClaimPageState> {
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

function getPropertyUnitHeadline(
  claim: Awaited<ReturnType<typeof resolveExistingTenantClaimToken>>,
) {
  const propertyName = claim.units?.properties?.property_name ?? "Property";
  const buildingName = claim.units?.building_name;
  const unitIdentifier = claim.units?.unit_identifier ?? "Unit";

  return `${propertyName} · ${
    buildingName ? `${buildingName} · ` : ""
  }${unitIdentifier}`;
}

function ClaimUnavailable({ message }: { message: string }) {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background text-base">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <SectionCard
            title="Link unavailable"
            description={message}
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

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;
  const state = await getClaimPageState(token);

  if (!state.ok) {
    return <ClaimUnavailable message={state.message} />;
  }

  const claim = state.claim;
  const unit = claim.units;
  const property = unit?.properties;
  const isUsed =
    claim.status === "submitted" ||
    claim.status === "approved" ||
    claim.status === "rejected";

  if (isUsed) {
    return (
      <ToastProvider>
        <main className="min-h-screen bg-background text-base">
          <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
            <TrustNotice
              title="This link has already been used"
              description="Your landlord has already received your details. Please contact them if you need to make changes."
            />
          </section>
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background text-base">
        <section className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:py-10">
          <p className="text-sm font-semibold text-text-muted">
            Boldverse Property
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-text-strong md:text-3xl">
            {getPropertyUnitHeadline(claim)}
          </h1>
          <p className="mt-2 text-base leading-7 text-text-muted">
            Confirm your tenancy details for this apartment.
          </p>

          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Apartment details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-button bg-background p-4">
                    <div className="flex items-center gap-2 text-text-muted">
                      <Home aria-hidden="true" size={18} strokeWidth={2.5} />
                      <p className="text-sm font-bold">Property</p>
                    </div>
                    <p className="mt-2 text-base font-extrabold text-text-strong">
                      {property?.property_name ?? "Property"}
                    </p>
                    <p className="mt-1 text-base leading-6 text-text-muted">
                      {property?.address ?? "Address not available"}
                    </p>
                  </div>
                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">Unit</p>
                    <p className="mt-2 text-base font-extrabold text-text-strong">
                      {unit?.unit_identifier ?? "Unit"}
                    </p>
                    <p className="mt-1 text-base leading-6 text-text-muted">
                      Listed rent: {formatNaira(Number(unit?.rent_amount ?? 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SectionCard
              title="Your tenancy details"
              description="Fill in the details below and submit once. Fields marked with * are required."
            >
              <ExistingTenantClaimPublicForm
                token={token}
                invitedName={claim.invited_tenant_full_name}
                invitedPhoneNumber={claim.invited_tenant_phone_number}
                invitedEmail={claim.invited_tenant_email}
                rentAmount={Number(unit?.rent_amount ?? 0)}
                rentFrequency={unit?.rent_frequency ?? "annual"}
              />
            </SectionCard>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-text-muted">
                  <CalendarClock aria-hidden="true" size={18} strokeWidth={2.5} />
                  <p className="text-sm font-bold">Link expires</p>
                </div>
                <p className="mt-2 text-base font-extrabold text-text-strong">
                  {new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(claim.token_expires_at))}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}
