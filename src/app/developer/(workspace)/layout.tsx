import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeveloperShell } from "@/components/layout/developer-shell";
import {
  getDeveloperAccountByOwnerProfileId,
  getDeveloperAccountByProfileId,
} from "@/server/repositories/developer.repository";
import { requireDeveloperUser } from "@/server/services/auth.service";
import { getBusinessSubscriptionPageData } from "@/server/services/business-subscription.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperWorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function DeveloperWorkspaceLayout({
  children,
}: DeveloperWorkspaceLayoutProps) {
  const developer = await requireDeveloperUser();
  const supabase = createSupabaseAdminClient();
  const ownedAccount = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );
  const membership = ownedAccount
    ? null
    : await getDeveloperAccountByProfileId(supabase, developer.id);
  const account = ownedAccount ?? membership?.account ?? null;
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSubscriptionPath = pathname.startsWith("/developer/subscription");

  if (account) {
    const subscriptionData = await getBusinessSubscriptionPageData({
      profileId: developer.id,
      workspaceType: "developer",
      profileEmail: developer.email,
    });

    if (!subscriptionData.hasAccess && !isSubscriptionPath) {
      redirect("/developer/subscription");
    }
  }

  return (
    <DeveloperShell
      developerName={developer.fullName}
      companyName={account?.company_name}
    >
      {children}
    </DeveloperShell>
  );
}
