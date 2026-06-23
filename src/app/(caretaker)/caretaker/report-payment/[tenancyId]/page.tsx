import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { requireCaretaker } from "@/server/services/auth.service";

type ReportPaymentPageProps = {
  params: Promise<{
    tenancyId: string;
  }>;
};

export default async function CaretakerReportPaymentPage({
  params,
}: ReportPaymentPageProps) {
  await requireCaretaker();
  const { tenancyId } = await params;

  return (
    <div className="space-y-4">
      <Link href="/caretaker/overview">
        <Button variant="secondary" size="sm">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
          Back to overview
        </Button>
      </Link>

      <SectionCard
        title="Report payment"
        description="Report a payment the tenant claims to have made outside BOPA."
      >
        <div className="space-y-3 p-4 md:p-5">
          <p className="text-sm leading-6 text-text-muted">
            Caretaker payment reporting is not wired up yet. Batch 2 will reuse or
            extend the manual payment flow so caretakers can enter amount, date,
            method, and optional proof — with status &quot;Reported by
            caretaker&quot; pending landlord confirmation.
          </p>
          <p className="text-xs font-semibold text-text-muted">
            Tenancy reference: {tenancyId}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
