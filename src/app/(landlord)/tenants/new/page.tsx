import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TenantShellForm } from "@/components/tenant/tenant-shell-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordVacantUnits } from "@/server/services/tenants.service";

export default async function NewTenantPage() {
  const vacantUnits = await getCurrentLandlordVacantUnits();

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
        title="Add Tenant"
        description="Start with the tenant's name, phone number, and unit. You can collect full details later."
      />

      <div className="mb-6">
        <TrustNotice
          title="Tenant profile starts simple"
          description="You only need the tenant's basic details now. Full profile, ID, guarantor, and agreement details can be completed through onboarding."
        />
      </div>

      <TenantShellForm vacantUnits={vacantUnits} />
    </div>
  );
}
