import { redirect } from "next/navigation";

type LegacyExistingTenantClaimLinkPageProps = {
  params: Promise<{
    token: string;
  }>;
};

/** Legacy public claim URLs: /existing-tenant-claims/link/{token} */
export default async function LegacyExistingTenantClaimLinkPage({
  params,
}: LegacyExistingTenantClaimLinkPageProps) {
  const { token } = await params;
  redirect(`/claim/${encodeURIComponent(token)}`);
}
