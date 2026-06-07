import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { PaymentVerificationAutoRefresh } from "@/components/payment/payment-verification-auto-refresh";
import { TenantReceiptDownloadCard } from "@/components/payment/tenant-receipt-download-card";
import { Badge } from "@/components/ui/badge";
import { BopaLoader } from "@/components/ui/bopa-loader";
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
    trxref?: string | string[];
    reference?: string | string[];
  }>;
};

type StatusTone = "success" | "danger" | "warning" | "primary";

type ChargeDisplayItem = {
  id: string;
  label: string;
  amount: number;
  isRefundable: boolean;
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
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function formatFeePercentage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "tiered";
  }

  return `${value.toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}%`;
}

function getRecordString(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function getRecordNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getRecordBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function getChargeDisplayItems(
  charges: Record<string, unknown>[],
): ChargeDisplayItem[] {
  return charges
    .map((charge, index) => ({
      id: getRecordString(charge, "id", `charge-${index}`),
      label: getRecordString(charge, "charge_name", "Landlord charge"),
      amount: getRecordNumber(charge, "amount"),
      isRefundable: getRecordBoolean(charge, "is_refundable"),
    }))
    .filter((charge) => charge.amount > 0);
}

function getStatusCopy(params: { status: string; isExpired: boolean }): {
  title: string;
  description: string;
  badge: string;
  tone: StatusTone;
  icon: React.ReactNode;
} {
  if (params.status === "paid") {
    return {
      title: "Payment successful",
      description:
        "Your rent payment has been confirmed and posted to your tenant record.",
      badge: "Paid",
      tone: "success",
      icon: <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  if (params.isExpired) {
    return {
      title: "Payment link expired",
      description:
        "This rent payment link has expired. Please ask your landlord to prepare a fresh payment link.",
      badge: "Expired",
      tone: "warning",
      icon: <Clock3 aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  if (
    params.status === "failed" ||
    params.status === "abandoned" ||
    params.status === "cancelled"
  ) {
    return {
      title: "Payment was not completed",
      description:
        "The transaction was not completed successfully. You can retry with the payment button below while this link is still valid.",
      badge: "Failed",
      tone: "danger",
      icon: <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />,
    };
  }

  return {
    title: "Review rent payment",
    description:
      "Confirm the rent amount, landlord charges, agent commission, BOPA Service Fee, and total before continuing to Paystack.",
    badge: "Awaiting Payment",
    tone: "primary",
    icon: <CreditCard aria-hidden="true" size={24} strokeWidth={2.6} />,
  };
}

function TenantPaymentLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
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

  const statusCopy = getStatusCopy({
    status: checkout.status,
    isExpired: checkout.isExpired,
  });

  const landlordCharges = getChargeDisplayItems(checkout.landlordCharges);
  const shouldShowLandlordCharges =
    landlordCharges.length > 0 || checkout.landlordChargesAmount > 0;
  const shouldShowAgentCommission = checkout.agentCommissionAmount > 0;
  const onlinePaymentAvailable = checkout.onlinePaymentAvailability.isVerified;
  const shouldShowPaymentUnavailable =
    !onlinePaymentAvailable &&
    !checkout.isExpired &&
    checkout.status !== "paid";

  const shouldAutoRefresh =
    shouldVerify &&
    !checkout.isExpired &&
    (checkout.status === "initialized" ||
      (checkout.status === "paid" && !checkout.receiptDownloadUrl));

  const canPay =
    checkout.status !== "paid" && !checkout.isExpired && onlinePaymentAvailable;

  return (
    <main className="min-h-screen bg-background">
      <PaymentVerificationAutoRefresh enabled={shouldAutoRefresh} />

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:py-10">
        <TenantPaymentLogo />

        <PageHeader
          title={statusCopy.title}
          description={
            shouldShowPaymentUnavailable
              ? checkout.onlinePaymentAvailability.guidance
              : statusCopy.description
          }
          action={<Badge tone={statusCopy.tone}>{statusCopy.badge}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <SectionCard
            title="Payment Summary"
            description="Review the server-calculated amount before proceeding to Paystack."
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
                      Rent Payment
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-text-strong">
                      {formatNaira(checkout.rentAmount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                      This is the rent amount credited to your tenancy ledger.
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      BOPA Service Fee
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-text-strong">
                      {formatNaira(checkout.bopaServiceFeeAmount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                      {formatFeePercentage(checkout.bopaServiceFeePercentage)}{" "}
                      tiered service fee calculated from the confirmed annual
                      rent.
                    </p>
                  </div>

                  {shouldShowLandlordCharges ? (
                    <div className="rounded-button bg-background p-4 md:col-span-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-text-muted">
                            Landlord Charges
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                            These charges are paid to the landlord.
                          </p>
                        </div>

                        <p className="text-lg font-extrabold text-text-strong">
                          {formatNaira(checkout.landlordChargesAmount)}
                        </p>
                      </div>

                      {landlordCharges.length > 0 ? (
                        <div className="mt-4 space-y-2 border-t border-border-soft pt-4">
                          {landlordCharges.map((charge) => (
                            <div
                              key={charge.id}
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <div>
                                <p className="font-bold text-text-strong">
                                  {charge.label}
                                </p>
                                {charge.isRefundable ? (
                                  <p className="mt-1 text-xs font-semibold text-text-muted">
                                    Refundable
                                  </p>
                                ) : null}
                              </div>

                              <p className="font-black text-text-strong">
                                {formatNaira(charge.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {shouldShowAgentCommission ? (
                    <div className="rounded-button bg-background p-4 md:col-span-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-text-muted">
                            Agent Commission
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                            This approved commission is paid to the agent. It
                            does not reduce the landlord’s rent.
                          </p>
                        </div>

                        <p className="text-lg font-extrabold text-text-strong">
                          {formatNaira(checkout.agentCommissionAmount)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-button bg-background p-4 md:col-span-2">
                    <p className="text-sm font-bold text-text-muted">
                      Total Payable
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-text-strong">
                      {formatNaira(checkout.totalAmount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                      This is the total amount Paystack will collect for this
                      transaction.
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

                  <div className="rounded-button bg-background p-4 md:col-span-2">
                    <p className="text-sm font-bold text-text-muted">
                      Link Expiry
                    </p>
                    <p className="mt-2 font-extrabold text-text-strong">
                      {formatDate(checkout.expiresAt)}
                    </p>
                  </div>
                </div>

                {checkout.isExpired && checkout.status !== "paid" ? (
                  <div className="mt-6 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 aria-hidden="true" size={18} strokeWidth={2.6} />
                      This link has expired and can no longer be used for
                      Paystack checkout.
                    </span>
                  </div>
                ) : null}

                {shouldShowPaymentUnavailable ? (
                  <div className="mt-6 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle
                        aria-hidden="true"
                        size={18}
                        strokeWidth={2.6}
                      />
                      {checkout.onlinePaymentAvailability.guidance}
                    </span>
                  </div>
                ) : null}

                {shouldAutoRefresh ? (
                  <div className="mt-6 rounded-button bg-warning-soft p-6">
                    <BopaLoader
                      size="sm"
                      label="BOPA is finishing confirmation and receipt preparation. This page will update automatically."
                      className="[&_p]:text-warning"
                    />
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

          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            {checkout.status === "paid" ? (
              <TenantReceiptDownloadCard
                receiptDownloadUrl={checkout.receiptDownloadUrl}
              />
            ) : null}

            {checkout.status === "paid" && checkout.activationUrl ? (
              <SectionCard
                title="Activate Tenant Dashboard"
                description="Your first rent payment has been confirmed. Create your password to access your tenant dashboard."
              >
                <TrustNotice
                  title="Activation link ready"
                  description={`This secure link expires on ${formatDate(
                    checkout.activationExpiresAt,
                  )}.`}
                  icon={
                    <KeyRound aria-hidden="true" size={22} strokeWidth={2.6} />
                  }
                />

                <a
                  href={checkout.activationUrl}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
                >
                  Activate My Tenant Account
                </a>
              </SectionCard>
            ) : null}

            {checkout.status === "paid" && !checkout.activationUrl ? (
              <TrustNotice
                title="Activation unavailable"
                description="Your payment is confirmed. If you have already activated your account, sign in from the tenant login page. Otherwise, contact your landlord."
                icon={
                  <KeyRound aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            ) : null}

            <TrustNotice
              title="Secure Paystack checkout"
              description="You will complete the payment on Paystack. After payment, Paystack redirects you back to BOPA for confirmation."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
