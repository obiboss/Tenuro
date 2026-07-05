import type {
  ManagerStaffInviteRow,
  ManagerStaffMemberRow,
} from "@/server/repositories/manager-staff.repository";
import { MANAGER_STAFF_ROLE_LABELS } from "@/lib/manager-staff-permission";

type ManagerStaffListProps = {
  members: ManagerStaffMemberRow[];
  invites: ManagerStaffInviteRow[];
  inviteBaseUrl: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function inviteStatus(invite: ManagerStaffInviteRow) {
  if (invite.accepted_at) {
    return "Accepted";
  }

  if (invite.revoked_at) {
    return "Revoked";
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return "Expired";
  }

  return "Pending";
}

export function ManagerStaffList({
  members,
  invites,
  inviteBaseUrl,
}: ManagerStaffListProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Active staff
        </h2>

        {members.length > 0 ? (
          <div className="mt-4 divide-y divide-border-soft">
            {members.map((member) => (
              <article key={member.id} className="py-4">
                <p className="font-black text-text-strong">
                  {member.staff_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {member.staff_email}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {MANAGER_STAFF_ROLE_LABELS[member.staff_role]}
                  </span>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
                    {member.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
            No staff member has accepted an invite yet.
          </p>
        )}
      </div>

      <div className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Staff invites
        </h2>

        {invites.length > 0 ? (
          <div className="mt-4 divide-y divide-border-soft">
            {invites.map((invite) => {
              const inviteUrl = `${inviteBaseUrl}/${invite.token}`;

              return (
                <article key={invite.id} className="space-y-3 py-4">
                  <div>
                    <p className="font-black text-text-strong">
                      {invite.staff_name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {invite.staff_email}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                      {MANAGER_STAFF_ROLE_LABELS[invite.staff_role]}
                    </span>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-black uppercase tracking-wide text-text-muted">
                      {inviteStatus(invite)}
                    </span>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-black uppercase tracking-wide text-text-muted">
                      Expires {formatDate(invite.expires_at)}
                    </span>
                  </div>

                  {!invite.accepted_at && !invite.revoked_at ? (
                    <a
                      href={inviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                    >
                      Open Invite Link
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
            No staff invite has been created yet.
          </p>
        )}
      </div>
    </section>
  );
}
