import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PaymentClaimDetail } from "@/components/payment/payment-claim-detail";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordPendingPaymentClaims } from "@/server/services/caretaker-payment-claims.service";
import { getCurrentLandlordRentControlOverview } from "@/server/services/rent-control-overview.service";
import { getCurrentLandlordTenancies } from "@/server/services/tenancies.service";

type PaymentClaimDetailPageProps = {
  params: Promise<{
    claimId: string;
  }>;
};

export default async function PaymentClaimDetailPage({
  params,
}: PaymentClaimDetailPageProps) {
  const { claimId } = await params;
  const [claims, tenancies, overview] = await Promise.all([
    getCurrentLandlordPendingPaymentClaims(),
    getCurrentLandlordTenancies(),
    getCurrentLandlordRentControlOverview(),
  ]);
  const claim = claims.find((item) => item.id === claimId);

  if (!claim) {
    notFound();
  }

  const tenancy = tenancies.find((item) => item.id === claim.tenancyId);
  const attentionItem = overview.needsAttention.find(
    (item) => item.tenancyId === claim.tenancyId,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/payments?tab=confirm"
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to payments
      </Link>

      <PageHeader
        title={`Confirm ${claim.tenantName}'s payment`}
        description="Check the claim and proof before recording the payment."
      />

      <SectionCard title="Payment claim" description={claim.propertyUnitLabel}>
        <PaymentClaimDetail
          claim={claim}
          rentDue={Number(tenancy?.rent_amount ?? 0)}
          amountOwing={attentionItem?.amountOwed ?? 0}
          dueDate={tenancy?.next_rent_charge_date ?? null}
        />
      </SectionCard>
    </div>
  );
}
