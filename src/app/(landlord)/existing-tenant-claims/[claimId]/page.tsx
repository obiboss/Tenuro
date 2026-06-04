import { notFound } from "next/navigation";
import { ExistingTenantClaimReviewDetail } from "@/components/tenant/existing-tenant-claim-review-detail";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordExistingTenantClaim } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimReviewPageProps = {
  params: Promise<{
    claimId: string;
  }>;
};

async function loadClaimForReview(claimId: string) {
  try {
    return await getCurrentLandlordExistingTenantClaim(claimId);
  } catch {
    return null;
  }
}

export default async function ExistingTenantClaimReviewPage({
  params,
}: ExistingTenantClaimReviewPageProps) {
  const { claimId } = await params;
  const claim = await loadClaimForReview(claimId);

  if (!claim) {
    notFound();
  }

  return (
    <main>
      <PageHeader
        title="Review existing tenant"
        description="Check tenant details, record rent history, and approve the tenancy."
      />

      <ExistingTenantClaimReviewDetail claim={claim} />
    </main>
  );
}
