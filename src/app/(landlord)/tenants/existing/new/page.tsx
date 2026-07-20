import Link from "next/link";
import {
  ArrowLeft,
  ClipboardPenLine,
  Link2,
  UserRoundCheck,
} from "lucide-react";
import { ExistingTenantClaimLinkForm } from "@/components/tenant/existing-tenant-claim-link-form";
import { ManualExistingTenantForm } from "@/components/tenant/manual-existing-tenant-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordExistingTenantClaimUnitOptions } from "@/server/services/existing-tenant-claims.service";

type NewExistingTenantClaimPageProps = {
  searchParams: Promise<{
    method?: string;
  }>;
};

function ExistingTenantMethodChoice() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <article className="flex min-h-64 flex-col rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ClipboardPenLine aria-hidden="true" size={24} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-xl font-black text-text-strong">
              Enter the details myself
            </h2>
            <p className="mt-2 text-base font-medium leading-7 text-text-muted">
              Add the tenant’s contact and last rent payment yourself. You can
              also record earlier arrears or part payments.
            </p>
          </div>
        </div>

        <Link
          href="/tenants/existing/new?method=manual"
          className="mt-auto pt-6"
        >
          <Button size="lg" fullWidth>
            Enter tenant details
          </Button>
        </Link>
      </article>

      <article className="flex min-h-64 flex-col rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
            <Link2 aria-hidden="true" size={24} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-xl font-black text-text-strong">
              Ask the tenant to fill it
            </h2>
            <p className="mt-2 text-base font-medium leading-7 text-text-muted">
              Enter their name, phone number and apartment. BOPA will prepare a
              secure link for WhatsApp.
            </p>
          </div>
        </div>

        <Link href="/tenants/existing/new?method=link" className="mt-auto pt-6">
          <Button size="lg" variant="secondary" fullWidth>
            Prepare tenant link
          </Button>
        </Link>
      </article>
    </div>
  );
}

export default async function NewExistingTenantClaimPage({
  searchParams,
}: NewExistingTenantClaimPageProps) {
  const [{ method }, units] = await Promise.all([
    searchParams,
    getCurrentLandlordExistingTenantClaimUnitOptions(),
  ]);
  const hasSelectedMethod = method === "manual" || method === "link";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={hasSelectedMethod ? "/tenants/existing/new" : "/tenants/new"}
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back
      </Link>

      <PageHeader
        title={
          method === "manual"
            ? "Enter existing tenant details"
            : method === "link"
              ? "Prepare the tenant link"
              : "How do you want to add the tenant?"
        }
        description={
          method === "manual"
            ? "Add the basic information BOPA needs to track rent and due dates."
            : method === "link"
              ? "Choose the apartment, enter the tenant’s name and phone number, then send the secure form."
              : "Choose the easier option for you."
        }
      />

      {units.length === 0 ? (
        <EmptyState
          title="No available units found"
          description="Create a property and unit before adding an existing tenant."
          icon={<UserRoundCheck size={24} strokeWidth={2.6} />}
          action={
            <Link href="/properties/new">
              <Button>Add property</Button>
            </Link>
          }
        />
      ) : method === "manual" ? (
        <SectionCard
          title="Tenant and rent information"
          description="You will check everything before the tenancy becomes active."
        >
          <ManualExistingTenantForm units={units} />
        </SectionCard>
      ) : method === "link" ? (
        <div className="space-y-6">
          <TrustNotice
            title="You will review everything first"
            description="The tenant’s answers will return to you for approval before their rent record becomes active."
          />

          <SectionCard
            title="Tenant link details"
            description="Choose the apartment the tenant already occupies."
          >
            <ExistingTenantClaimLinkForm units={units} />
          </SectionCard>
        </div>
      ) : (
        <ExistingTenantMethodChoice />
      )}
    </div>
  );
}
