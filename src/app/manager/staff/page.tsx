import { ManagerStaffInviteForm } from "@/components/manager/manager-staff-invite-form";
import { ManagerStaffList } from "@/components/manager/manager-staff-list";
import { getManagerStaffPageData } from "@/server/services/manager-staff-access.service";

export default async function ManagerStaffPage() {
  const data = await getManagerStaffPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-strong">
          Staff Access
        </h1>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Invite staff with safe default roles. No custom permission setup is
          needed.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <ManagerStaffInviteForm />
        <ManagerStaffList
          members={data.members}
          invites={data.invites}
          inviteBaseUrl={data.inviteBaseUrl}
        />
      </section>
    </div>
  );
}
