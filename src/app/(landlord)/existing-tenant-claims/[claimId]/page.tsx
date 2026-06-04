import { notFound } from "next/navigation";
import { ExistingTenantClaimReviewDetail } from "@/components/tenant/existing-tenant-claim-review-detail";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordExistingTenantClaim } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimReviewPageProps = {
  params: Promise<{
    claimId: string;
  }>;
};

export default async function ExistingTenantClaimReviewPage({
  params,
}: ExistingTenantClaimReviewPageProps) {
  const { claimId } = await params;

  try {
    const claim = await getCurrentLandlordExistingTenantClaim(claimId);

    return (
      <main>
        <PageHeader
          title="Review existing tenant"
          description="Check tenant details, record rent history, and approve the tenancy."
        />

        <ExistingTenantClaimReviewDetail claim={claim} />
      </main>
    );
  } catch {
    notFound();
  }
}
