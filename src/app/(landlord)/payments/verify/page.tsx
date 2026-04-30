import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ReceiptText,
} from "lucide-react";
import { PaymentVerificationAutoRefresh } from "@/components/payment/payment-verification-auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordPaymentVerification } from "@/server/services/payment-verify.service";
import { formatNaira } from "@/server/utils/money";

type PaymentVerifyPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
  }>;
};

type PaymentStatusTone = "success" | "danger" | "warning";

type PaymentStatusCopy = {
  title: string;
  description: string;
  tone: PaymentStatusTone;
  icon: React.ReactNode;
  badge: string;
};

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

function getStatusCopy(status: string): PaymentStatusCopy {
  if (status === "paid") {
    return {
      title: "Payment successful",
      description:
        "The rent payment has been confirmed and posted to the tenant balance.",
      tone: "success",
      icon: <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />,
      badge: "Paid",
    };
  }

  if (status === "failed" || status === "abandoned" || status === "cancelled") {
    return {
      title: "Payment was not completed",
      description:
        "The tenant was not charged successfully. You can retry the payment from the tenant profile.",
      tone: "danger",
      icon: <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />,
      badge: "Failed",
    };
  }

  return {
    title: "Payment is processing",
    description:
      "Paystack has redirected back to Tenuro. We are checking the payment status and will update this page automatically.",
    tone: "warning",
    icon: <Clock3 aria-hidden="true" size={24} strokeWidth={2.6} />,
    badge: "Processing",
  };
}

export default async function PaymentVerifyPage({
  searchParams,
}: PaymentVerifyPageProps) {
  const resolvedSearchParams = await searchParams;

  const reference =
    getSearchParamValue(resolvedSearchParams.reference) ??
    getSearchParamValue(resolvedSearchParams.trxref);

  if (!reference) {
    return (
      <div>
        <Link
          href="/payments"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to payments
        </Link>

        <PageHeader
          title="Payment Verification"
          description="We could not find a payment reference for this request."
        />

        <SectionCard
          title="Payment reference missing"
          description="Please return to the tenant profile and start the payment again."
        >
          <TrustNotice
            title="No payment reference found"
            description="The payment link is incomplete, so Tenuro cannot check the payment status."
            icon={
              <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />
        </SectionCard>
      </div>
    );
  }

  const intent = await getCurrentLandlordPaymentVerification(reference);

  if (!intent) {
    return (
      <div>
        <Link
          href="/payments"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to payments
        </Link>

        <PageHeader
          title="Payment Verification"
          description="We could not find this payment in Tenuro."
        />

        <SectionCard
          title="Payment not found"
          description="This can happen if the payment link is old or was not created from this account."
        >
          <TrustNotice
            title="Payment record not found"
            description="Please go back to the tenant profile and create a fresh payment link."
            icon={
              <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />
        </SectionCard>
      </div>
    );
  }

  const statusCopy = getStatusCopy(intent.status);
  const shouldAutoRefresh = intent.status === "initialized";

  return (
    <div>
      <PaymentVerificationAutoRefresh enabled={shouldAutoRefresh} />

      <Link
        href="/payments"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
        Back to payments
      </Link>

      <PageHeader
        title="Payment Verification"
        description="Check the status of this Paystack rent payment."
        action={<Badge tone={statusCopy.tone}>{statusCopy.badge}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title={statusCopy.title}
          description={statusCopy.description}
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
                    Reference: {intent.paystack_reference}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Rent Amount
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-text-strong">
                    {formatNaira(Number(intent.rent_amount))}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Tenuro Fee
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-text-strong">
                    {formatNaira(Number(intent.tenuro_fee_amount))}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Total Paid
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-text-strong">
                    {formatNaira(Number(intent.total_amount))}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Confirmed At
                  </p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {formatDate(intent.paid_at)}
                  </p>
                </div>
              </div>

              {shouldAutoRefresh ? (
                <div className="mt-6 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
                  Tenuro is checking this payment automatically. You do not need
                  to refresh the page.
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/payments"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-hover"
                >
                  <ReceiptText aria-hidden="true" size={18} strokeWidth={2.6} />
                  View Payments
                </Link>

                <Link
                  href={`/tenants/${intent.tenant_id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-semibold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
                >
                  Back to Tenant
                </Link>
              </div>
            </CardContent>
          </Card>
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <TrustNotice
            title="Payment posting"
            description="Tenuro first listens for Paystack’s secure webhook. If it is delayed, this page safely re-checks the payment status and updates the record."
          />
        </div>
      </div>
    </div>
  );
}
