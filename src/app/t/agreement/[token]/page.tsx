import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";
import { TenantAgreementAcceptanceForm } from "@/components/tenancy/tenant-agreement-acceptance-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  getTenantAgreementPdfDownloadUrlFromToken,
  resolveTenancyAgreementAcceptanceToken,
} from "@/server/services/tenancy-agreements.service";

type TenantAgreementPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type AgreementResolution =
  | {
      ok: true;
      agreement: Awaited<
        ReturnType<typeof resolveTenancyAgreementAcceptanceToken>
      >;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveAgreementSafely(
  token: string,
): Promise<AgreementResolution> {
  try {
    const agreement = await resolveTenancyAgreementAcceptanceToken(token);

    return {
      ok: true,
      agreement,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This agreement link could not be opened.",
    };
  }
}

function TenantAgreementLogo() {
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
          Tenancy agreement
        </p>
      </div>
    </Link>
  );
}

function AgreementUnavailable({ message }: { message: string }) {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <TenantAgreementLogo />

          <SectionCard
            title="Agreement link unavailable"
            description="We could not open this tenancy agreement link."
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

export default async function TenantAgreementPage({
  params,
}: TenantAgreementPageProps) {
  const { token } = await params;
  const resolution = await resolveAgreementSafely(token);

  if (!resolution.ok) {
    return <AgreementUnavailable message={resolution.message} />;
  }

  const agreement = resolution.agreement;
  const alreadyAccepted = agreement.document_status === "accepted";

  const pdfDownloadUrl = alreadyAccepted
    ? await getTenantAgreementPdfDownloadUrlFromToken(token)
    : null;

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
          <TenantAgreementLogo />

          <PageHeader
            title="Review your tenancy agreement"
            description="Read the full agreement carefully before accepting."
            action={
              <Badge tone={alreadyAccepted ? "success" : "primary"}>
                {alreadyAccepted ? "Accepted" : "Awaiting Acceptance"}
              </Badge>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <SectionCard
                title={agreement.title}
                description="This is the final agreement prepared by the landlord."
              >
                <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-button bg-white p-5 text-sm leading-7 text-text-normal shadow-soft ring-1 ring-border-soft">
                  {agreement.finalized_body || agreement.agreement_body}
                </pre>
              </SectionCard>
            </div>

            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <TrustNotice
                title="Read before accepting"
                description="Your acceptance will be recorded digitally with a timestamp."
              />

              <TenantAgreementAcceptanceForm
                token={token}
                alreadyAccepted={alreadyAccepted}
                pdfDownloadUrl={pdfDownloadUrl}
              />
            </div>
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}
