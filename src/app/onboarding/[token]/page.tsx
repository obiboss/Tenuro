import { redirect } from "next/navigation";

type TenantOnboardingAliasPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function TenantOnboardingAliasPage({
  params,
}: TenantOnboardingAliasPageProps) {
  const { token } = await params;

  redirect(`/t/onboarding/${encodeURIComponent(token)}`);
}
