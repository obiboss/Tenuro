import Link from "next/link";
import { DeveloperStaffInviteAcceptanceForm } from "@/components/developer/developer-staff-invite-acceptance-form";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicDeveloperStaffRoleLinkByToken } from "@/server/services/developer-staff.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DeveloperStaffInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function DeveloperStaffInvitePage({
  params,
}: DeveloperStaffInvitePageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const roleLink = await getPublicDeveloperStaffRoleLinkByToken({
    supabase,
    token,
  });

  if (!roleLink) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl space-y-6">
          <PageHeader
            title="Onboarding link unavailable"
            description="This staff onboarding link is invalid, expired, or revoked."
          />

          <Link
            href="/developer/login"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-dark"
          >
            Go to Developer Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Join Developer Workspace"
          description="Complete your staff account to access the company workspace."
        />

        <DeveloperStaffInviteAcceptanceForm
          token={token}
          staffTitleLabel={roleLink.staffTitleLabel}
        />

        <Link
          href="/developer/login"
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
        >
          Already joined? Sign in
        </Link>
      </div>
    </main>
  );
}
