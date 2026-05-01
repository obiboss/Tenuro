import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getPublicTenantPaymentCheckout } from "@/server/services/gateway-payment.service";
import { formatNaira } from "@/server/utils/money";

type TenantPaymentPageProps = {
  params: Promise<{
    reference: string;
  }>;
  searchParams: Promise<{
    verify?: string | string[];
  }>;
};

type StatusTone = "success" | "danger" | "warning" | "primary";

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusCopy(status: string): {
  title: string;
  description: string;
  badge: string;
  tone: StatusTone;
  icon: React.ReactNode;
} {
  if (status === "paid") {
    return {
      title: "Payment successful",
      description:
        "Your rent payment has been confirmed and posted to your tenant record.",
      badge: "Paid",
      tone: "success",
      icon: <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  if (status === "failed" || status === "abandoned" || status === "cancelled") {
    return {
      title: "Payment was not completed",
      description:
        "The transaction was not completed successfully. You can retry with the payment button below if the link is still valid.",
      badge: "Failed",
      tone: "danger",
      icon: <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  return {
    title: "Review rent payment",
    description:
      "Confirm the rent amount, Tenuro fee, and total before continuing to Paystack.",
    badge: "Awaiting Payment",
    tone: "primary",
    icon: <CreditCard aria-hidden="true" size={24} strokeWidth={2.6} />,
  };
}

function TenantPaymentLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Tenuro
        </p>
        <p className="text-xs font-semibold text-text-muted">Rent payment</p>
      </div>
    </Link>
  );
}

export default async function TenantPaymentPage({
  params,
  searchParams,
}: TenantPaymentPageProps) {
  const { reference } = await params;
  const resolvedSearchParams = await searchParams;
  const shouldVerify = getSearchParamValue(resolvedSearchParams.verify) === "1";

  const checkout = await getPublicTenantPaymentCheckout({
    reference,
    verify: shouldVerify,
  });

  if (!checkout) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <TenantPaymentLogo />

          <SectionCard
            title="Payment link unavailable"
            description="We could not open this rent payment link."
          >
            <TrustNotice
              title="Please request a new link"
              description="This payment link is invalid or no longer available. Ask the landlord to prepare a fresh payment link."
              icon={
                <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
              }
            />
          </SectionCard>
        </section>
      </main>
    );
  }

  const statusCopy = getStatusCopy(checkout.status);
  const canPay = checkout.status !== "paid";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
        <TenantPaymentLogo />

        <PageHeader
          title={statusCopy.title}
          description={statusCopy.description}
          action={<Badge tone={statusCopy.tone}>{statusCopy.badge}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <SectionCard
            title="Payment Summary"
            description="Review the amount before proceeding to Paystack."
          >
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    {statusCopy.icon}
                  </div>

                  <div className="min-w-0">
                    <CardTitle>{statusCopy.title}</CardTitle>
                    <p className="mt-1 break-all text-sm leading-6 text-text-muted">
                      Reference: {checkout.reference}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Property
                    </p>
                    <p className="mt-2 font-extrabold text-text-strong">
                      {checkout.propertyName ?? "Property"}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">Unit</p>
                    <p className="mt-2 font-extrabold text-text-strong">
                      {checkout.unitIdentifier ?? "Unit"}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Rent Amount
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-text-strong">
                      {formatNaira(checkout.rentAmount)}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Tenuro Fee
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-text-strong">
                      {formatNaira(checkout.tenuroFeeAmount)}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4 md:col-span-2">
                    <p className="text-sm font-bold text-text-muted">
                      Total Payable
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-text-strong">
                      {formatNaira(checkout.totalAmount)}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Period Start
                    </p>
                    <p className="mt-2 font-extrabold text-text-strong">
                      {formatDate(checkout.periodStart)}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Period End
                    </p>
                    <p className="mt-2 font-extrabold text-text-strong">
                      {formatDate(checkout.periodEnd)}
                    </p>
                  </div>
                </div>

                {shouldVerify && checkout.status === "initialized" ? (
                  <div className="mt-6 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 aria-hidden="true" size={18} strokeWidth={2.6} />
                      Payment verification is still processing. Refresh this
                      page in a moment.
                    </span>
                  </div>
                ) : null}

                {canPay ? (
                  <a
                    href={checkout.authorizationUrl}
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
                  >
                    Continue to Paystack
                  </a>
                ) : null}
              </CardContent>
            </Card>
          </SectionCard>

          <div className="xl:sticky xl:top-28 xl:self-start">
            <TrustNotice
              title="Secure Paystack checkout"
              description="You will complete the payment on Paystack. After payment, Paystack redirects you back to Tenuro for confirmation."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
