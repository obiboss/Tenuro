import Link from "next/link";
import { ArrowLeft, Home, UserPlus } from "lucide-react";
import { TenantShellForm } from "@/components/tenant/tenant-shell-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentLandlordVacantUnits } from "@/server/services/tenants.service";

type NewTenantPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

function TenantTypeChoice() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <article className="flex min-h-64 flex-col rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <UserPlus aria-hidden="true" size={24} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-xl font-black text-text-strong">
              A new tenant
            </h2>
            <p className="mt-2 text-base font-medium leading-7 text-text-muted">
              Someone new is about to move into your property. Enter their name
              and phone number, then send the secure form.
            </p>
          </div>
        </div>

        <Link href="/tenants/new?type=new" className="mt-auto pt-6">
          <Button size="lg" fullWidth>
            Add a new tenant
          </Button>
        </Link>
      </article>

      <article className="flex min-h-64 flex-col rounded-card border border-border-soft bg-white p-5 shadow-card md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
            <Home aria-hidden="true" size={24} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-xl font-black text-text-strong">
              Already living there
            </h2>
            <p className="mt-2 text-base font-medium leading-7 text-text-muted">
              The tenant already lives in the apartment and pays rent to you.
            </p>
          </div>
        </div>

        <Link href="/tenants/existing/new" className="mt-auto pt-6">
          <Button size="lg" variant="secondary" fullWidth>
            Set up existing tenant
          </Button>
        </Link>
      </article>
    </div>
  );
}

export default async function NewTenantPage({
  searchParams,
}: NewTenantPageProps) {
  const [{ type }, vacantUnits] = await Promise.all([
    searchParams,
    getCurrentLandlordVacantUnits(),
  ]);
  const showNewTenantForm = type === "new";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={showNewTenantForm ? "/tenants/new" : "/tenants"}
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back
      </Link>

      <PageHeader
        title={
          showNewTenantForm
            ? "Add a new tenant"
            : "Who will live in this apartment?"
        }
        description={
          showNewTenantForm
            ? "Enter only the details needed to prepare the tenant’s secure form."
            : "Choose the option that fits. We’ll guide you from there."
        }
      />

      {showNewTenantForm ? (
        <TenantShellForm vacantUnits={vacantUnits} />
      ) : (
        <TenantTypeChoice />
      )}
    </div>
  );
}
