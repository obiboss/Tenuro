import { redirect } from "next/navigation";

type LegacyClaimRedirectPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function LegacyClaimRedirectPage({
  params,
}: LegacyClaimRedirectPageProps) {
  const { token } = await params;
  redirect(`/claim/${encodeURIComponent(token)}`);
}
