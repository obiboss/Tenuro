import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DeveloperPaymentCheckoutStatus } from "@/components/developer/developer-payment-checkout-status";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { errorResult } from "@/server/errors/result";
import { getPublicDeveloperPaymentCheckout } from "@/server/services/developer-payment.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { DeveloperPaymentIntentRow } from "@/server/repositories/developer-payment-intents.repository";

type DeveloperPublicPaymentPageProps = {
  params: Promise<{
    reference: string;
  }>;
  searchParams: Promise<{
    verify?: string | string[];
  }>;
};

type PaymentPageState =
  | {
      status: "not_found";
      errorMessage: string;
      intent: null;
      buyerPortalUrl: null;
    }
  | {
      status: "ready";
      errorMessage?: string;
      intent: DeveloperPaymentIntentRow;
      buyerPortalUrl: string | null;
    };

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

function DeveloperPaymentLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Developer payment
        </p>
      </div>
    </Link>
  );
}

function getPageTitle(params: {
  intent: DeveloperPaymentIntentRow;
  errorMessage?: string;
}) {
  if (params.errorMessage) {
    return "Payment verification failed";
  }

  if (params.intent.status === "paid") {
    return "Payment confirmed";
  }

  return "Review plot payment";
}

function getPageDescription(params: {
  intent: DeveloperPaymentIntentRow;
  errorMessage?: string;
}) {
  if (params.errorMessage) {
    return "We could not verify this payment automatically. No duplicate payment has been posted.";
  }

  if (params.intent.status === "paid") {
    return "Your payment has been verified and posted to the buyer ledger.";
  }

  return "Review the installment amount, Boldverse platform fee, and total before continuing to Paystack.";
}

async function resolvePaymentPageState(params: {
  reference: string;
  shouldVerify: boolean;
}): Promise<PaymentPageState> {
  const supabase = createSupabaseAdminClient();

  try {
    const checkout = await getPublicDeveloperPaymentCheckout({
      supabase,
      reference: params.reference,
      verify: params.shouldVerify,
    });

    if (!checkout) {
      return {
        status: "not_found",
        errorMessage: "This payment link is invalid or no longer available.",
        intent: null,
        buyerPortalUrl: null,
      };
    }

    return {
      status: "ready",
      intent: checkout.intent,
      buyerPortalUrl: checkout.buyerPortalUrl,
    };
  } catch (error) {
    const result = errorResult(error);

    const fallbackCheckout = await getPublicDeveloperPaymentCheckout({
      supabase,
      reference: params.reference,
      verify: false,
    });

    if (!fallbackCheckout) {
      return {
        status: "not_found",
        errorMessage: result.message,
        intent: null,
        buyerPortalUrl: null,
      };
    }

    return {
      status: "ready",
      errorMessage: result.message,
      intent: fallbackCheckout.intent,
      buyerPortalUrl: fallbackCheckout.buyerPortalUrl,
    };
  }
}

export default async function DeveloperPublicPaymentPage({
  params,
  searchParams,
}: DeveloperPublicPaymentPageProps) {
  const { reference } = await params;
  const resolvedSearchParams = await searchParams;
  const shouldVerify = getSearchParamValue(resolvedSearchParams.verify) === "1";
  const pageState = await resolvePaymentPageState({
    reference,
    shouldVerify,
  });

  if (pageState.status === "not_found") {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <DeveloperPaymentLogo />

          <SectionCard
            title="Payment link unavailable"
            description="We could not open this developer payment link."
          >
            <TrustNotice
              title="Please request a new link"
              description={pageState.errorMessage}
              icon={<AlertTriangle aria-hidden="true" size={22} />}
            />
          </SectionCard>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <DeveloperPaymentLogo />

        <PageHeader
          title={getPageTitle({
            intent: pageState.intent,
            errorMessage: pageState.errorMessage,
          })}
          description={getPageDescription({
            intent: pageState.intent,
            errorMessage: pageState.errorMessage,
          })}
          action={
            <Badge
              tone={
                pageState.errorMessage
                  ? "danger"
                  : pageState.intent.status === "paid"
                    ? "success"
                    : "primary"
              }
            >
              {pageState.errorMessage
                ? "Verification Failed"
                : pageState.intent.status === "paid"
                  ? "Paid"
                  : "Awaiting Payment"}
            </Badge>
          }
        />

        <DeveloperPaymentCheckoutStatus
          intent={pageState.intent}
          errorMessage={pageState.errorMessage}
          buyerPortalUrl={pageState.buyerPortalUrl}
        />
      </section>
    </main>
  );
}
