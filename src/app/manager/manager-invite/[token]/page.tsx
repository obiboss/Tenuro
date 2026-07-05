import Link from "next/link";
import { acceptManagerStaffInviteAction } from "@/actions/manager-staff.actions";
import {
  getManagerStaffInvitePreview,
  MANAGER_STAFF_ROLE_LABELS,
} from "@/server/services/manager-staff-access.service";

type ManagerInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

function getInviteState(
  invite: Awaited<ReturnType<typeof getManagerStaffInvitePreview>>,
) {
  if (!invite) {
    return {
      canAccept: false,
      title: "Invite not found",
      message: "This staff invite could not be found.",
    };
  }

  if (invite.accepted_at) {
    return {
      canAccept: false,
      title: "Invite already accepted",
      message: "This staff invite has already been accepted.",
    };
  }

  if (invite.revoked_at) {
    return {
      canAccept: false,
      title: "Invite no longer available",
      message: "This staff invite has been withdrawn.",
    };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      canAccept: false,
      title: "Invite expired",
      message: "Ask the company owner to send a new invite.",
    };
  }

  return {
    canAccept: true,
    title: "Accept staff invite",
    message: "Sign in with the invited email address, then accept this invite.",
  };
}

export default async function ManagerInvitePage({
  params,
}: ManagerInvitePageProps) {
  const resolvedParams = await params;
  const invite = await getManagerStaffInvitePreview(resolvedParams.token);
  const inviteState = getInviteState(invite);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <section className="mx-auto max-w-xl rounded-card border border-border-soft bg-white p-6 shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white">
          B
        </div>

        <h1 className="mt-5 text-center text-2xl font-black tracking-tight text-text-strong">
          {inviteState.title}
        </h1>

        <p className="mt-3 text-center text-sm font-semibold leading-6 text-text-muted">
          {inviteState.message}
        </p>

        {invite ? (
          <div className="mt-5 rounded-card bg-surface p-4">
            <p className="text-sm font-black text-text-strong">
              {invite.staff_name}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {invite.staff_email}
            </p>
            <p className="mt-2 text-sm font-bold text-primary">
              {MANAGER_STAFF_ROLE_LABELS[invite.staff_role]}
            </p>
          </div>
        ) : null}

        {inviteState.canAccept ? (
          <form action={acceptManagerStaffInviteAction} className="mt-6">
            <input type="hidden" name="token" value={resolvedParams.token} />

            <button
              type="submit"
              className="min-h-12 w-full rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              Accept Invite
            </button>
          </form>
        ) : null}

        <div className="mt-4 flex justify-center">
          <Link
            href="/manager/login"
            className="text-sm font-extrabold text-primary hover:underline"
          >
            Sign in to BOPA Manager
          </Link>
        </div>
      </section>
    </main>
  );
}
