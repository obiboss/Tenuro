import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getPublicDeveloperPaymentCheckout } from "@/server/services/developer-payment.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { formatNaira } from "@/server/utils/money";

type DeveloperPublicPaymentPageProps = {
  params: Promise<{
    reference: string;
  }>;
  searchParams: Promise<{
    verify?: string | string[];
  }>;
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

export default async function DeveloperPublicPaymentPage({
  params,
  searchParams,
}: DeveloperPublicPaymentPageProps) {
  const { reference } = await params;
  const resolvedSearchParams = await searchParams;
  const shouldVerify = getSearchParamValue(resolvedSearchParams.verify) === "1";
  const supabase = createSupabaseAdminClient();

  const intent = await getPublicDeveloperPaymentCheckout({
    supabase,
    reference,
    verify: shouldVerify,
  });

  if (!intent) {
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
              description="This payment link is invalid or no longer available."
              icon={<AlertTriangle aria-hidden="true" size={22} />}
            />
          </SectionCard>
        </section>
      </main>
    );
  }

  const isPaid = intent.status === "paid";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <DeveloperPaymentLogo />

        <PageHeader
          title={isPaid ? "Payment confirmed" : "Review plot payment"}
          description={
            isPaid
              ? "Your payment has been verified and posted to the buyer ledger."
              : "Review the installment amount, Boldverse platform fee, and total before continuing to Paystack."
          }
          action={
            <Badge tone={isPaid ? "success" : "primary"}>
              {isPaid ? "Paid" : "Awaiting Payment"}
            </Badge>
          }
        />

        <SectionCard
          title="Payment Summary"
          description="All amounts are server-calculated from the payment request."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Installment</p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(Number(intent.installment_amount))}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">
                Boldverse platform fee
              </p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(Number(intent.platform_fee_amount))}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Total payable</p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(Number(intent.total_amount))}
              </p>
            </div>
          </div>

          {isPaid ? (
            <TrustNotice
              title="Payment posted"
              description="The developer and buyer records have been updated automatically."
              icon={<CheckCircle2 aria-hidden="true" size={22} />}
              className="mt-5"
            />
          ) : (
            <a
              href={intent.authorization_url ?? "#"}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
            >
              <CreditCard aria-hidden="true" size={18} />
              Continue to Paystack
            </a>
          )}
        </SectionCard>
      </section>
    </main>
  );
}
