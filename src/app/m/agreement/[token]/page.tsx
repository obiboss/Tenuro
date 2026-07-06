import Link from "next/link";
import { PublicManagerAgreementAcceptanceForm } from "@/components/manager/public-manager-agreement-acceptance-form";
import { resolveManagerTenantAgreementToken } from "@/server/services/manager-tenant-onboarding.service";

type ManagerAgreementPublicPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type Resolution =
  | {
      ok: true;
      agreement: Awaited<ReturnType<typeof resolveManagerTenantAgreementToken>>;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveSafely(token: string): Promise<Resolution> {
  try {
    const agreement = await resolveManagerTenantAgreementToken(token);

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

function PublicLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>
      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          BOPA Manager
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Tenancy agreement
        </p>
      </div>
    </Link>
  );
}

export default async function ManagerAgreementPublicPage({
  params,
}: ManagerAgreementPublicPageProps) {
  const { token } = await params;
  const resolution = await resolveSafely(token);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <PublicLogo />

        {!resolution.ok ? (
          <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
            <h1 className="text-xl font-black tracking-tight text-text-strong">
              Agreement unavailable
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {resolution.message}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
              <h1 className="text-xl font-black tracking-tight text-text-strong">
                {resolution.agreement.title}
              </h1>

              <pre className="mt-4 max-h-180 overflow-auto whitespace-pre-wrap rounded-button bg-surface p-4 text-sm leading-7 text-text-normal">
                {resolution.agreement.finalized_body ||
                  resolution.agreement.agreement_body}
              </pre>
            </section>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <PublicManagerAgreementAcceptanceForm
                token={token}
                agreement={resolution.agreement}
                pdfDownloadUrl={`/m/agreement/${encodeURIComponent(
                  token,
                )}/download`}
              />
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
