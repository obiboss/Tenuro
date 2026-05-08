import Link from "next/link";
import { AlertTriangle, Building2, ShieldCheck } from "lucide-react";
import { TenantOnboardingForm } from "@/components/tenant/tenant-onboarding-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getPublicTenantOnboardingByToken } from "@/server/services/agent-tenant-onboarding.service";

type TenantOnboardingPageProps = {
  params: Promise<{
    token: string;
  }>;
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

export default async function TenantOnboardingPage({
  params,
}: TenantOnboardingPageProps) {
  const { token } = await params;

  try {
    const tenant = await getPublicTenantOnboardingByToken(token);
    const propertyName = tenant.units?.properties?.property_name ?? "Property";
    const unitName = tenant.units?.unit_identifier ?? "Unit";

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
                  Complete your tenant profile
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
                description="Complete the form carefully. The landlord will review your details before the next step."
              >
                <TenantOnboardingForm
                  token={token}
                  fullName={tenant.full_name}
                  phoneNumber={tenant.phone_number}
                  email={tenant.email}
                  isSubmitted={tenant.onboarding_status === "profile_complete"}
                  propertyRules={[]}
                />
              </SectionCard>
            </div>
          </div>
        </div>
      </main>
    );
  } catch (error) {
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
                  {getErrorMessage(error)}
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
}
