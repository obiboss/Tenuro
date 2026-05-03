import Link from "next/link";
import { AlertTriangle, Building2, KeyRound } from "lucide-react";
import { TenantActivationForm } from "@/components/tenant/tenant-activation-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import { resolveTenantActivationToken } from "@/server/services/tenant-activation.service";

type TenantActivationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type ActivationResolution =
  | {
      ok: true;
      activation: Awaited<ReturnType<typeof resolveTenantActivationToken>>;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveActivationSafely(
  token: string,
): Promise<ActivationResolution> {
  try {
    const activation = await resolveTenantActivationToken(token);

    return {
      ok: true,
      activation,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This activation link could not be opened.",
    };
  }
}

function TenantActivationLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Tenuro
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Tenant activation
        </p>
      </div>
    </Link>
  );
}

function ActivationUnavailable({ message }: { message: string }) {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <TenantActivationLogo />

          <SectionCard
            title="Activation link unavailable"
            description="We could not open this tenant activation link."
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

export default async function TenantActivationPage({
  params,
}: TenantActivationPageProps) {
  const { token } = await params;
  const resolution = await resolveActivationSafely(token);

  if (!resolution.ok) {
    return <ActivationUnavailable message={resolution.message} />;
  }

  const tenant = resolution.activation.tenants;

  if (!tenant) {
    return (
      <ActivationUnavailable message="This tenant activation link could not be opened." />
    );
  }

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:py-10">
          <TenantActivationLogo />

          <PageHeader
            title="Activate your tenant account"
            description="Create your password so you can access your tenant dashboard."
            action={<Badge tone="primary">Secure Link</Badge>}
          />

          <div className="space-y-6">
            <TrustNotice
              title="Set your password"
              description="After activation, you can sign in with your phone number and password."
              icon={<KeyRound aria-hidden="true" size={22} strokeWidth={2.6} />}
            />

            <TenantActivationForm
              token={token}
              tenantName={tenant.full_name}
              phoneNumber={tenant.phone_number}
            />
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}
