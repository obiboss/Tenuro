import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { ExistingTenantClaimReviewList } from "@/components/tenant/existing-tenant-claim-review-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordExistingTenantClaims } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimsPageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

export default async function ExistingTenantClaimsPage({
  searchParams,
}: ExistingTenantClaimsPageProps) {
  const { filter } = await searchParams;
  const claims = await getCurrentLandlordExistingTenantClaims();
  const submittedCount = claims.filter(
    (claim) => claim.status === "submitted",
  ).length;
  const showingSubmittedClaims = filter === "submitted";
  const visibleClaims = showingSubmittedClaims
    ? claims.filter((claim) => claim.status === "submitted")
    : claims;

  return (
    <main>
      <PageHeader
        title={
          showingSubmittedClaims ? "Tenants awaiting review" : "Existing Tenant Claims"
        }
        description={
          showingSubmittedClaims
            ? "Review the submitted information before approving a tenant."
            : "Review existing tenants who submitted their move-in date, rent amount, and rent due date."
        }
        action={
          <Link href="/tenants/existing/new">
            <Button>Invite Existing Tenant</Button>
          </Link>
        }
      />

      <SectionCard
        title={showingSubmittedClaims ? "Submitted information" : "Claim Review"}
        description={`${submittedCount} tenant${
          submittedCount === 1 ? "" : "s"
        } awaiting review`}
      >
        {visibleClaims.length === 0 ? (
          <EmptyState
            title={
              showingSubmittedClaims
                ? "Nothing to review right now"
                : "No existing tenant claims yet"
            }
            description={
              showingSubmittedClaims
                ? "Submitted tenant information will appear here."
                : "Invite an existing tenant to confirm their tenancy details. Submitted claims will appear here for review."
            }
            icon={<UserRoundCheck size={24} strokeWidth={2.6} />}
            action={
              <Link href="/tenants/existing/new">
                <Button>Invite Existing Tenant</Button>
              </Link>
            }
          />
        ) : (
          <ExistingTenantClaimReviewList claims={visibleClaims} />
        )}
      </SectionCard>
    </main>
  );
}
