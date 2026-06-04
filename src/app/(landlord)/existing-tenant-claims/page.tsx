import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { ExistingTenantClaimReviewList } from "@/components/tenant/existing-tenant-claim-review-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordExistingTenantClaims } from "@/server/services/existing-tenant-claims.service";

export default async function ExistingTenantClaimsPage() {
  const claims = await getCurrentLandlordExistingTenantClaims();
  const submittedCount = claims.filter(
    (claim) => claim.status === "submitted",
  ).length;

  return (
    <main>
      <PageHeader
        title="Existing Tenant Claims"
        description="Review existing tenants who submitted their move-in date, rent amount, and rent due date."
        action={
          <Link href="/tenants/existing/new">
            <Button>Invite Existing Tenant</Button>
          </Link>
        }
      />

      <SectionCard
        title="Claim Review"
        description={`${submittedCount} tenant${
          submittedCount === 1 ? "" : "s"
        } awaiting review`}
      >
        {claims.length === 0 ? (
          <EmptyState
            title="No existing tenant claims yet"
            description="Invite an existing tenant to confirm their tenancy details. Submitted claims will appear here for review."
            icon={<UserRoundCheck size={24} strokeWidth={2.6} />}
            action={
              <Link href="/tenants/existing/new">
                <Button>Invite Existing Tenant</Button>
              </Link>
            }
          />
        ) : (
          <ExistingTenantClaimReviewList claims={claims} />
        )}
      </SectionCard>
    </main>
  );
}
