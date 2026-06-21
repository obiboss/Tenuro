import { Badge } from "@/components/ui/badge";
import {
  getDeveloperStaffPermissionLabel,
  getDeveloperStaffTitleLabel,
} from "@/constants/developer-staff-permissions";
import type { DeveloperStaffMemberRow } from "@/server/repositories/developer-staff.repository";

type DeveloperStaffListProps = {
  members: DeveloperStaffMemberRow[];
};

export function DeveloperStaffList({ members }: DeveloperStaffListProps) {
  return (
    <section className="rounded-card border border-border-soft bg-white p-5 shadow-soft">
      <div>
        <p className="text-lg font-black text-text-strong">Active staff</p>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          Staff who completed onboarding under this developer company.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {members.length === 0 ? (
          <div className="rounded-button bg-background px-4 py-5 text-sm font-semibold text-text-muted">
            No staff has joined yet. Generate a role link and send it to the
            right person.
          </div>
        ) : (
          members.map((member) => (
            <article
              key={member.id}
              className="rounded-card border border-border-soft bg-background p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black text-text-strong">
                    {member.full_name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {member.phone_number}
                    {member.email ? ` • ${member.email}` : ""}
                  </p>
                  <p className="mt-2 text-sm font-bold text-text-muted">
                    {member.staff_title
                      ? getDeveloperStaffTitleLabel(member.staff_title)
                      : "Staff"}
                  </p>
                </div>

                <Badge tone={member.is_active ? "success" : "neutral"}>
                  {member.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {member.developer_staff_permissions.length === 0 ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-text-muted">
                    No permissions
                  </span>
                ) : (
                  member.developer_staff_permissions.map((permission) => (
                    <span
                      key={`${member.id}-${permission.permission_key}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-text-muted"
                    >
                      {getDeveloperStaffPermissionLabel(
                        permission.permission_key,
                      )}
                    </span>
                  ))
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
