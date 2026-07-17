import { DeveloperStaffList } from "@/components/developer/developer-staff-list";
import { DeveloperStaffRoleLinks } from "@/components/developer/developer-staff-role-links";
import { PageHeader } from "@/components/ui/page-header";
import type { DeveloperStaffTitle } from "@/constants/developer-staff-permissions";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import {
  listDeveloperStaffMembers,
  listDeveloperStaffRoleLinks,
} from "@/server/repositories/developer-staff.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function getAcceptedCountsByTitle(
  roleLinks: Awaited<ReturnType<typeof listDeveloperStaffRoleLinks>>,
) {
  return roleLinks.reduce<Partial<Record<DeveloperStaffTitle, number>>>(
    (accumulator, roleLink) => {
      accumulator[roleLink.staff_title] =
        (accumulator[roleLink.staff_title] ?? 0) + roleLink.accepted_count;

      return accumulator;
    },
    {},
  );
}

export default async function DeveloperStaffPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account || account.status !== "active") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff"
          description="Your developer account must be active before you can manage staff."
        />

        <div className="rounded-card border border-border-soft bg-white p-6 text-sm font-semibold text-text-muted shadow-soft">
          Developer account is not active.
        </div>
      </div>
    );
  }

  const [members, roleLinks] = await Promise.all([
    listDeveloperStaffMembers(supabase, account.id),
    listDeveloperStaffRoleLinks(supabase, account.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Generate role-based onboarding links. Staff fill their own details and join under this company."
      />

      <DeveloperStaffRoleLinks
        acceptedCountsByTitle={getAcceptedCountsByTitle(roleLinks)}
      />

      <DeveloperStaffList members={members} />
    </div>
  );
}
