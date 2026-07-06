import Link from "next/link";
import { PublicManagerTenantOnboardingForm } from "@/components/manager/public-manager-tenant-onboarding-form";
import { resolveManagerTenantOnboardingToken } from "@/server/services/manager-tenant-onboarding.service";

type ManagerTenantOnboardingPublicPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type Resolution =
  | {
      ok: true;
      request: Awaited<ReturnType<typeof resolveManagerTenantOnboardingToken>>;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveSafely(token: string): Promise<Resolution> {
  try {
    const request = await resolveManagerTenantOnboardingToken(token);

    return {
      ok: true,
      request,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This tenant link could not be opened.",
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
        <p className="text-xs font-semibold text-text-muted">Tenant details</p>
      </div>
    </Link>
  );
}

export default async function ManagerTenantOnboardingPublicPage({
  params,
}: ManagerTenantOnboardingPublicPageProps) {
  const { token } = await params;
  const resolution = await resolveSafely(token);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <PublicLogo />

        {!resolution.ok ? (
          <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
            <h1 className="text-xl font-black tracking-tight text-text-strong">
              Link unavailable
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {resolution.message}
            </p>
          </div>
        ) : (
          <PublicManagerTenantOnboardingForm
            token={token}
            request={resolution.request}
          />
        )}
      </section>
    </main>
  );
}
