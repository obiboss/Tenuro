import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ClaimedPublicAgreementsList } from "@/components/public-tools/claimed-public-agreements-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordClaimedPublicAgreements } from "@/server/services/public-agreement-imports.service";

export default async function PublicAgreementsPage() {
  const agreements = await getCurrentLandlordClaimedPublicAgreements();

  return (
    <div>
      <Link
        href="/overview"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to overview
      </Link>

      <PageHeader
        title="Imported Agreements"
        description="Review tenancy agreements created from the public agreement generator and claimed during account creation."
        action={<Badge tone="primary">{agreements.length} Imported</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <SectionCard
          title="Claimed Public Agreements"
          description="These agreements came from the public generator. Review them before deciding whether to turn them into full editable tenancy agreement records."
        >
          <ClaimedPublicAgreementsList agreements={agreements} />
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <TrustNotice
            title="Review-only for now"
            description="Imported agreements are attached to your account, property, and tenant shell, but they are not yet full editable agreement records."
            icon={<FileText aria-hidden="true" size={22} strokeWidth={2.6} />}
          />
        </div>
      </div>
    </div>
  );
}
