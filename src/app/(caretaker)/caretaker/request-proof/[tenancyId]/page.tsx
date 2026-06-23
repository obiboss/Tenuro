import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RequestPaymentProofPanel } from "@/components/caretaker/request-payment-proof-panel";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getCaretakerProofRequestPageContext } from "@/server/services/caretaker-payment-claims.service";

type RequestProofPageProps = {
  params: Promise<{
    tenancyId: string;
  }>;
};

type PageState =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof getCaretakerProofRequestPageContext>>;
    }
  | {
      ok: false;
      message: string;
    };

export default async function CaretakerRequestProofPage({
  params,
}: RequestProofPageProps) {
  const { tenancyId } = await params;

  let state: PageState;

  try {
    const data = await getCaretakerProofRequestPageContext(tenancyId);
    state = { ok: true, data };
  } catch (error) {
    state = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Payment proof request cannot be opened.",
    };
  }

  return (
    <div className="space-y-4">
      <Link href="/caretaker/overview">
        <Button variant="secondary" size="sm">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
          Back to overview
        </Button>
      </Link>

      <SectionCard
        title="Request proof"
        description="Send the tenant a secure payment proof link."
      >
        <div className="p-4 md:p-5">
          {state.ok ? (
            <RequestPaymentProofPanel
              tenancyId={state.data.tenancyId}
              tenantName={state.data.tenantName}
              tenantPhone={state.data.tenantPhone}
              propertyUnitLabel={state.data.propertyUnitLabel}
              rentAmount={state.data.rentAmount}
            />
          ) : (
            <p className="rounded-2xl bg-danger/10 p-3 text-sm font-bold text-danger">
              {state.message}
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
