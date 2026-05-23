import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";

type VerificationProcessingSummaryProps = {
  fullName: string;
  phoneNumber: string;
  email: string | null;
  occupation: string | null;
  homeAddress: string | null;
  propertyName: string;
  unitIdentifier: string;
  processingFeeAmount: number;
  currencyCode: string;
  authorizationUrl: string | null;
  paymentNotice: string | null;
  isOfficiallySubmitted: boolean;
  isPaymentDisabled?: boolean;
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function VerificationProcessingSummary({
  fullName,
  phoneNumber,
  email,
  occupation,
  homeAddress,
  propertyName,
  unitIdentifier,
  processingFeeAmount,
  currencyCode,
  authorizationUrl,
  paymentNotice,
  isOfficiallySubmitted,
  isPaymentDisabled = false,
}: VerificationProcessingSummaryProps) {
  if (isOfficiallySubmitted) {
    return (
      <SectionCard
        title="Application submitted"
        description="Your verification and processing is complete. The landlord will review your application."
      >
        <TrustNotice
          title="Submitted for landlord review"
          description="Your tenant profile has been officially submitted. The landlord will review your details and contact you with the next step."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Verification & Processing Summary"
      description="Review your application details and complete verification processing to activate your tenant profile for landlord review."
    >
      <div className="space-y-5">
        {paymentNotice ? (
          <div
            role="alert"
            className="rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning"
          >
            {paymentNotice}
          </div>
        ) : null}

        <div className="rounded-button bg-background p-4">
          <h3 className="text-sm font-extrabold text-text-strong">
            Application Summary
          </h3>

          <dl className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-text-muted">Full name</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {fullName}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold text-text-muted">Phone</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {phoneNumber}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold text-text-muted">Email</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {email || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold text-text-muted">Occupation</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {occupation || "Not provided"}
              </dd>
            </div>

            <div className="md:col-span-2">
              <dt className="text-xs font-bold text-text-muted">Home address</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {homeAddress || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold text-text-muted">Property</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {propertyName}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold text-text-muted">Unit</dt>
              <dd className="mt-1 text-sm font-extrabold text-text-strong">
                {unitIdentifier}
              </dd>
            </div>
          </dl>
        </div>

        <TrustNotice
          title="What happens next"
          description="After payment, BOPA will process your verification details and make your profile available for landlord review. The landlord may approve, reject, or waitlist your application."
          icon={<ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <div className="rounded-button border border-warning/20 bg-warning-soft p-4">
          <p className="text-sm font-extrabold text-text-strong">
            Important notice
          </p>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Verification and processing does not guarantee apartment allocation,
            landlord approval, or tenancy approval. Final tenancy decisions
            remain subject to landlord review, property availability,
            verification outcome, and tenant suitability.
          </p>
        </div>

        <div className="rounded-button bg-background p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <CreditCard aria-hidden="true" size={18} strokeWidth={2.5} />
            <p className="text-sm font-bold">Verification & Processing Fee</p>
          </div>

          <p className="mt-2 text-2xl font-extrabold text-text-strong">
            {formatMoney(processingFeeAmount, currencyCode)}
          </p>

          <p className="mt-2 text-sm leading-6 text-text-muted">
            Complete verification and processing to activate your tenant profile
            for landlord review.
          </p>
        </div>

        {authorizationUrl ? (
          <Link href={authorizationUrl}>
            <Button type="button" fullWidth>
              Pay Verification & Processing Fee
            </Button>
          </Link>
        ) : isPaymentDisabled ? (
          <TrustNotice
            title="Verification fee temporarily unavailable"
            description="Verification and processing fee is currently disabled. Please contact support or try again later."
          />
        ) : (
          <Button type="button" fullWidth disabled>
            Preparing payment...
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
