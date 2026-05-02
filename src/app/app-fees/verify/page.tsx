import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentLandlordAppFeePaymentVerification } from "@/server/services/app-fee-payment.service";
import { formatNaira } from "@/server/utils/money";

type AppFeeVerifyPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
  }>;
};

type AppFeeStatusTone = "success" | "danger" | "warning";

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
  tone: AppFeeStatusTone;
  badge: string;
  icon: React.ReactNode;
} {
  if (status === "paid") {
    return {
      title: "App fee payment successful",
      description: "The Tenuro app fee has been confirmed.",
      tone: "success",
      badge: "Paid",
      icon: <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  if (status === "failed" || status === "abandoned" || status === "cancelled") {
    return {
      title: "App fee payment was not completed",
      description:
        "The app fee was not charged successfully. You can return to Payments and try again.",
      tone: "danger",
      badge: "Failed",
      icon: <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  return {
    title: "App fee is processing",
    description:
      "Paystack redirected back to Tenuro. We are checking the app fee payment status.",
    tone: "warning",
    badge: "Processing",
    icon: <Clock3 aria-hidden="true" size={24} strokeWidth={2.6} />,
  };
}

export default async function AppFeeVerifyPage({
  searchParams,
}: AppFeeVerifyPageProps) {
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
          title="App Fee Verification"
          description="We could not find a payment reference for this request."
        />

        <SectionCard
          title="Payment reference missing"
          description="Return to Payments and start the app fee payment again."
        >
          <TrustNotice
            title="No payment reference found"
            description="The payment link is incomplete, so Tenuro cannot check the app fee payment status."
            icon={
              <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />
        </SectionCard>
      </div>
    );
  }

  const intent = await getCurrentLandlordAppFeePaymentVerification(reference);

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
          title="App Fee Verification"
          description="We could not find this app fee payment in Tenuro."
        />

        <SectionCard
          title="App fee payment not found"
          description="This can happen if the payment link is old or was not created from this account."
        >
          <TrustNotice
            title="Payment record not found"
            description="Please return to Payments and create a fresh app fee checkout."
            icon={
              <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />
        </SectionCard>
      </div>
    );
  }

  const statusCopy = getStatusCopy(intent.status);

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
        title="App Fee Verification"
        description="Check the status of this Tenuro app fee payment."
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
                    App Fee Amount
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-text-strong">
                    {formatNaira(Number(intent.fee_amount))}
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

              <Link
                href="/payments"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-hover"
              >
                <CreditCard aria-hidden="true" size={18} strokeWidth={2.6} />
                Back to Payments
              </Link>
            </CardContent>
          </Card>
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <TrustNotice
            title="Separate from rent"
            description="This app fee is separate from tenant rent. Use it only when rent was collected outside Tenuro."
          />
        </div>
      </div>
    </div>
  );
}
