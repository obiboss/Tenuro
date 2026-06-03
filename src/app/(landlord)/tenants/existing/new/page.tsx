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
        title="Invite Existing Tenant"
        description="Send a secure link so an existing tenant can confirm their details without you typing everything manually."
      />

      <div className="mb-6">
        <TrustNotice
          title="Landlord stays in control"
          description="The tenant can only submit claimed details. You must review and approve the rent amount, move-in date, and next due date before BOPA creates the final tenancy record."
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
          title="Prepare Claim Link"
          description="Choose the unit the tenant already occupies."
        >
          <ExistingTenantClaimLinkForm units={units} />
        </SectionCard>
      )}
    </div>
  );
}
