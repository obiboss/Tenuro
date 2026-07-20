import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy | Boldverse Property",
  description:
    "Refund and cancellation policy for Boldverse Property (BOPA) platform fees, subscriptions, and payment-related services.",
  alternates: {
    canonical: "https://boldverseproperty.com/refund-policy",
  },
};

const bulletItems = {
  platformFees: [
    "The tenant onboarding fee (₦5,000 one-time fee per new tenancy)",
    "The annual rent payment platform fee (₦2,000 per payment)",
  ],
  agentFees: [
    "The ₦10,000 agent portion is non-refundable once disbursed to the agent via Paystack",
    "The ₦5,000 BOPA portion is non-refundable once the onboarding process is complete",
  ],
  subscription: [
    "Property manager and real estate developer subscriptions renew automatically at ₦70,000 monthly or ₦600,000 yearly after the two-month free period",
    "Cancellation within 7 days of payment with no premium features used: full refund",
    "Cancellation within 7 days of payment with premium features used: no refund",
    "Cancellation after 7 days: no refund, access continues until the end of the subscription period",
  ],
  disputes: [
    "First contact their landlord directly",
    "If unresolved, contact BOPA at hello@boldverseproperty.com with their receipt number and details of the dispute",
    "BOPA will facilitate a review but cannot guarantee a refund where funds have already been settled to the landlord's bank account",
  ],
  refundRequest: [
    "Your full name and phone number",
    "Your account email or the phone number used at registration",
    "The transaction reference number",
    "A clear description of the reason for the refund request",
  ],
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 pl-5">
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-3">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-card md:p-8">
      <h2 className="mb-4 text-xl font-extrabold tracking-tight text-text-strong">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-soft bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-extrabold tracking-tight text-white shadow-soft">
              B
            </div>
            <span className="text-base font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-strong"
          >
            <ArrowLeft size={16} strokeWidth={2.6} />
            Back to home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        {/* Hero */}
        <div className="mb-10 border-b border-border-soft pb-10">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ReceiptText size={24} strokeWidth={2.6} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Legal
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl">
            Refund and Cancellation Policy
          </h1>

          <p className="mt-3 text-sm text-text-muted">
            Boldverse Property (BOPA) &mdash; Last updated: July 2026
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-10 text-base leading-8 text-text-normal">
          <PolicySection title="1. Platform Fees on Rent Payments">
            <p className="mb-4">
              The platform fee charged on each online rent payment processed
              through BOPA is non-refundable once Paystack has successfully
              processed the transaction.
            </p>

            <p className="mb-4">This applies to:</p>

            <BulletList items={bulletItems.platformFees} />

            <p className="mt-4 text-sm text-text-muted">
              These fees cover digital processing, record keeping, receipt
              generation, and platform services delivered at the point of
              transaction.
            </p>
          </PolicySection>

          <PolicySection title="2. Agent Registration Fee">
            <p className="mb-4">
              The agent registration fee of ₦15,000 is charged when a tenant is
              successfully onboarded through an agent and a tenancy is created.
            </p>

            <BulletList items={bulletItems.agentFees} />

            <p className="mt-4 rounded-xl bg-gold-soft p-4 text-sm font-semibold text-text-strong">
              If a tenancy fails to complete after the registration fee is paid
              — for example, if the landlord rejects the tenant after payment —
              please contact us at{" "}
              <a
                href="mailto:hello@boldverseproperty.com"
                className="text-primary hover:underline"
              >
                hello@boldverseproperty.com
              </a>{" "}
              within 48 hours and we will review the circumstances on a
              case-by-case basis.
            </p>
          </PolicySection>

          <PolicySection title="3. Subscriptions">
            <p className="mb-4">
              BOPA subscriptions, including manager and developer company
              subscriptions, may be cancelled at any time. Stopping automatic
              renewal does not remove access already paid for during the current
              subscription period.
            </p>

            <BulletList items={bulletItems.subscription} />

            <p className="mt-4">
              To cancel your subscription, contact us at{" "}
              <a
                href="mailto:hello@boldverseproperty.com"
                className="font-semibold text-primary hover:underline"
              >
                hello@boldverseproperty.com
              </a>{" "}
              or use the secure billing option on your subscription page.
            </p>
          </PolicySection>

          <PolicySection title="4. Rent Payment Disputes">
            <p className="mb-4">
              BOPA is not a party to rent payment transactions between landlords
              and tenants. Rent payments processed through Paystack are subject
              to Paystack&apos;s refund and dispute policies.
            </p>

            <p className="mb-4">
              If a tenant believes a rent payment was made in error or disputes
              a charge, they should:
            </p>

            <NumberedList items={bulletItems.disputes} />
          </PolicySection>

          <PolicySection title="5. Free Tool Token Purchases">
            <p className="mb-4">
              Token purchases for watermark-free receipt or agreement generation
              without registration are non-refundable once the document has been
              generated and downloaded.
            </p>

            <p>
              If a technical error prevented your document from generating,
              contact{" "}
              <a
                href="mailto:hello@boldverseproperty.com"
                className="font-semibold text-primary hover:underline"
              >
                hello@boldverseproperty.com
              </a>{" "}
              within 24 hours for a replacement or refund.
            </p>
          </PolicySection>

          <PolicySection title="6. How to Request a Refund">
            <p className="mb-4">
              All refund requests must be submitted to{" "}
              <a
                href="mailto:hello@boldverseproperty.com"
                className="font-semibold text-primary hover:underline"
              >
                hello@boldverseproperty.com
              </a>{" "}
              with:
            </p>

            <BulletList items={bulletItems.refundRequest} />

            <p className="mt-4 text-sm text-text-muted">
              We aim to respond to all refund requests within 3 business days.
            </p>
          </PolicySection>

          <PolicySection title="7. Contact">
            <p>
              Email:{" "}
              <a
                href="mailto:hello@boldverseproperty.com"
                className="font-semibold text-primary hover:underline"
              >
                hello@boldverseproperty.com
              </a>
            </p>

            <p className="mt-2">
              Website:{" "}
              <a
                href="https://boldverseproperty.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                boldverseproperty.com
              </a>
            </p>
          </PolicySection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-soft">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row md:px-8">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} Boldverse Services. All rights
            reserved.
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-text-muted sm:justify-end">
            <Link
              href="/privacy"
              className="transition-colors hover:text-text-strong"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-text-strong"
            >
              Terms & Conditions
            </Link>

            <Link href="/refund-policy" className="font-semibold text-primary">
              Refund Policy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
