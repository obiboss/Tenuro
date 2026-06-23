import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PendingPaymentClaimsPanel } from "@/components/payment/pending-payment-claims-panel";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordPendingPaymentClaims } from "@/server/services/caretaker-payment-claims.service";

type PageState =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof getCurrentLandlordPendingPaymentClaims>>;
    }
  | {
      ok: false;
      message: string;
    };

export default async function LandlordPaymentClaimsPage() {
  let state: PageState;

  try {
    const data = await getCurrentLandlordPendingPaymentClaims();
    state = { ok: true, data };
  } catch (error) {
    state = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Payment claims could not be loaded.",
    };
  }

  return (
    <div className="space-y-4">
      <Link href="/payments">
        <Button variant="secondary" size="sm">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
          Back to payments
        </Button>
      </Link>

      <SectionCard
        title="Payment claims"
        description="Confirm or reject tenant proof submissions and caretaker-reported payments."
      >
        <div className="p-4 md:p-5">
          {state.ok ? (
            <PendingPaymentClaimsPanel claims={state.data} />
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
