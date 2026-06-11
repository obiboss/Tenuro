import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { DeveloperPaymentIntentRow } from "@/server/repositories/developer-payment-intents.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperPaymentCheckoutStatusProps = {
  intent: DeveloperPaymentIntentRow;
  errorMessage?: string;
  buyerPortalUrl?: string | null;
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export function DeveloperPaymentCheckoutStatus({
  intent,
  errorMessage,
  buyerPortalUrl = null,
}: DeveloperPaymentCheckoutStatusProps) {
  const isPaid = intent.status === "paid";
  const isPayable = intent.status === "initialized" && !errorMessage;

  return (
    <SectionCard
      title="Payment Summary"
      description="All amounts are server-calculated from the payment request."
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Badge tone={isPaid ? "success" : errorMessage ? "danger" : "primary"}>
          {errorMessage ? "Verification Failed" : formatStatus(intent.status)}
        </Badge>

        <p className="text-sm font-semibold text-text-muted">
          Reference:{" "}
          <span className="font-black text-text-strong">
            {intent.paystack_reference}
          </span>
        </p>
      </div>

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

      {errorMessage ? (
        <TrustNotice
          title="Payment could not be verified"
          description={errorMessage}
          icon={<AlertTriangle aria-hidden="true" size={22} />}
          className="mt-5"
        />
      ) : null}

      {isPaid ? (
        <TrustNotice
          title="Payment confirmed"
          description="Your payment has been verified. Your purchase record and receipts are now available in your buyer portal."
          icon={<CheckCircle2 aria-hidden="true" size={22} />}
          className="mt-5"
        />
      ) : null}

      {isPaid && buyerPortalUrl ? (
        <a
          href={buyerPortalUrl}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          Open buyer portal
        </a>
      ) : null}

      {isPayable ? (
        <a
          href={intent.authorization_url ?? "#"}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          <CreditCard aria-hidden="true" size={18} />
          Continue to Paystack
        </a>
      ) : null}

      {!buyerPortalUrl ? (
        <div className="mt-5 rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
          To return to your buyer portal, use the secure link sent to you by the
          developer.
        </div>
      ) : null}

      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Boldverse Property
      </Link>
    </SectionCard>
  );
}
