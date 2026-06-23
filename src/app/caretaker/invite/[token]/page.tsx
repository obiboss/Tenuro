import Link from "next/link";
import { CaretakerInviteAcceptancePanel } from "@/components/caretaker/caretaker-invite-acceptance-panel";
import { PageHeader } from "@/components/ui/page-header";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getCaretakerInviteAcceptanceContext } from "@/server/services/caretaker-invites.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaretakerInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

type InviteResolution =
  | {
      ok: true;
      context: Awaited<ReturnType<typeof getCaretakerInviteAcceptanceContext>>;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveInviteSafely(token: string): Promise<InviteResolution> {
  try {
    const context = await getCaretakerInviteAcceptanceContext(token);

    return {
      ok: true,
      context,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This caretaker invite could not be opened.",
    };
  }
}

export default async function CaretakerInvitePage({
  params,
}: CaretakerInvitePageProps) {
  const { token } = await params;
  const resolution = await resolveInviteSafely(token);

  return (
    <ToastProvider>
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl space-y-6">
          {resolution.ok ? (
            <>
              <PageHeader
                title="Caretaker invite"
                description="Review this invite and accept access to assigned properties."
              />

              <CaretakerInviteAcceptancePanel
                token={token}
                caretakerName={resolution.context.invite.caretaker_name}
                caretakerPhone={resolution.context.invite.caretaker_phone}
                landlordName={resolution.context.landlordName}
                propertyNames={resolution.context.propertyNames}
                canAcceptNow={resolution.context.canAcceptNow}
                roleConflict={resolution.context.roleConflict}
                isLoggedIn={resolution.context.sessionUser !== null}
              />
            </>
          ) : (
            <>
              <PageHeader
                title="Invite unavailable"
                description={resolution.message}
              />

              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </ToastProvider>
  );
}
