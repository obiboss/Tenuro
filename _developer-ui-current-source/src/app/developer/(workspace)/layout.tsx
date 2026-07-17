import { DeveloperShell } from "@/components/layout/developer-shell";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperWorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function DeveloperWorkspaceLayout({
  children,
}: DeveloperWorkspaceLayoutProps) {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  return (
    <DeveloperShell
      developerName={developer.fullName}
      companyName={account?.company_name}
    >
      {children}
    </DeveloperShell>
  );
}
