import Link from "next/link";
import { AlertTriangle, Building2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getPublicTenantOnboardingByToken } from "@/server/services/agent-tenant-onboarding.service";

type TenantOnboardingPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type TenantOnboardingPageState =
  | {
      ok: true;
      tenant: Awaited<ReturnType<typeof getPublicTenantOnboardingByToken>>;
    }
  | {
      ok: false;
      message: string;
    };

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "This tenant onboarding link could not be opened. Please ask the agent or landlord to send a new link.";
}

function TenuroBrand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Tenuro
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Property records made simple
        </p>
      </div>
    </Link>
  );
}

async function getPageState(token: string): Promise<TenantOnboardingPageState> {
  try {
    const tenant = await getPublicTenantOnboardingByToken(token);

    return {
      ok: true,
      tenant,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export default async function TenantOnboardingPage({
  params,
}: TenantOnboardingPageProps) {
  const { token } = await params;
  const state = await getPageState(token);

  if (!state.ok) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl">
          <TenuroBrand />

          <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <Badge tone="warning">Onboarding link issue</Badge>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                  This link cannot be opened
                </h1>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {state.message}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/">
                <Button type="button" fullWidth>
                  Back to Tenuro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const propertyName =
    state.tenant.units?.properties?.property_name ?? "Property";
  const unitName = state.tenant.units?.unit_identifier ?? "Unit";
  const buildingName = state.tenant.units?.building_name;

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <TenuroBrand />

        <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck aria-hidden="true" size={24} strokeWidth={2.6} />
            </div>

            <div>
              <Badge tone="primary">Tenant onboarding</Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                Tenant invitation received
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                You have been invited to complete your tenant profile for{" "}
                <span className="font-bold text-text-strong">{unitName}</span>{" "}
                at{" "}
                <span className="font-bold text-text-strong">
                  {propertyName}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="mt-6">
            <SectionCard
              title={`${propertyName} — ${unitName}`}
              description="Your tenant onboarding link is valid. The full KYC submission form will be connected in the next patch."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Tenant name
                  </p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {state.tenant.full_name}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Phone number
                  </p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {state.tenant.phone_number}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Property</p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {propertyName}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Unit</p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {buildingName ? `${buildingName} — ${unitName}` : unitName}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-button bg-primary-soft px-4 py-3 text-sm font-semibold leading-6 text-primary">
                Your invitation has been opened successfully. Please contact the
                agent or landlord for the next onboarding step while the full
                tenant KYC submission form is being connected.
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
