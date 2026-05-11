import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ClaimedPublicReceiptsList } from "@/components/public-tools/claimed-public-receipts-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordClaimedPublicReceipts } from "@/server/services/public-receipt-imports.service";

export default async function PublicReceiptsPage() {
  const receipts = await getCurrentLandlordClaimedPublicReceipts();

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
        title="Imported Receipts"
        description="Review receipts created from the public receipt generator and claimed during account creation."
        action={<Badge tone="primary">{receipts.length} Imported</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <SectionCard
          title="Claimed Public Receipts"
          description="These receipts came from the public generator. Review them before deciding whether to create full tenancy and ledger records."
        >
          <ClaimedPublicReceiptsList receipts={receipts} />
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <TrustNotice
            title="Review-only for now"
            description="Imported receipts are attached to your account, property, and tenant shell, but they are not yet posted into your financial ledger."
            icon={<FileText aria-hidden="true" size={22} strokeWidth={2.6} />}
          />
        </div>
      </div>
    </div>
  );
}
