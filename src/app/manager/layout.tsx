import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager/manager-shell";
import { canManagerRoleAccessPath } from "@/lib/manager-staff-permission";
import { getManagerOrganizationAccessForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerLayoutProps = {
  children: React.ReactNode;
};

export default async function ManagerLayout({ children }: ManagerLayoutProps) {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const access = await getManagerOrganizationAccessForCurrentUser(
    supabase,
    manager.id,
  );

  const organization = access?.organization ?? null;
  const staffRole = access?.staffRole ?? "owner";

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isOnboardingPath = pathname === "/manager/onboarding";

  if (!organization && pathname && !isOnboardingPath) {
    redirect("/manager/onboarding");
  }

  if (organization && isOnboardingPath) {
    redirect("/manager/overview");
  }

  if (
    organization &&
    pathname &&
    !canManagerRoleAccessPath(staffRole, pathname)
  ) {
    redirect("/manager/overview");
  }

  return (
    <ManagerShell
      managerName={manager.fullName}
      organizationName={organization?.organization_name}
      staffRole={staffRole}
    >
      {children}
    </ManagerShell>
  );
}
