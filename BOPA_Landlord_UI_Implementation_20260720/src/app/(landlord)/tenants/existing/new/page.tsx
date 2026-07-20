import Link from "next/link";
import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { ExistingTenantClaimLinkForm } from "@/components/tenant/existing-tenant-claim-link-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordExistingTenantClaimUnitOptions } from "@/server/services/existing-tenant-claims.service";

export default async function NewExistingTenantClaimPage() {
  const units = await getCurrentLandlordExistingTenantClaimUnitOptions();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tenants"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to tenants
      </Link>

      <PageHeader
        title="Add an existing tenant"
        description="Enter their name, phone number and apartment, then send the secure link."
      />

      <div className="mb-6">
        <TrustNotice
          title="You will review everything first"
          description="The tenant’s answers will return to you for approval before their rent record becomes active."
        />
      </div>

      {units.length === 0 ? (
        <EmptyState
          title="No available units found"
          description="Create a property and unit before inviting an existing tenant to confirm tenancy details."
          icon={<UserRoundCheck size={24} strokeWidth={2.6} />}
          action={
            <Link href="/properties/new">
              <Button>Add Property</Button>
            </Link>
          }
        />
      ) : (
        <SectionCard
          title="Prepare the tenant link"
          description="Choose the apartment the tenant already occupies."
        >
          <ExistingTenantClaimLinkForm units={units} />
        </SectionCard>
      )}
    </div>
  );
}
