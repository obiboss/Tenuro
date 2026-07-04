import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager/manager-shell";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerLayoutProps = {
  children: React.ReactNode;
};

export default async function ManagerLayout({ children }: ManagerLayoutProps) {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isOnboardingPath = pathname === "/manager/onboarding";

  if (!organization && pathname && !isOnboardingPath) {
    redirect("/manager/onboarding");
  }

  if (organization && isOnboardingPath) {
    redirect("/manager/overview");
  }

  return (
    <ManagerShell
      managerName={manager.fullName}
      organizationName={organization?.organization_name}
    >
      {children}
    </ManagerShell>
  );
}
