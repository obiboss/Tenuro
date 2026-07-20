import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions | Boldverse Property",
  description:
    "Terms and Conditions for using Boldverse Property (BOPA) property management platform.",
  alternates: {
    canonical: "https://boldverseproperty.com/terms",
  },
};

const termsData = {
  platformTools: [
    "Tenant management and digital onboarding",
    "Tenancy agreement generation and storage",
    "Rent payment tracking and receipt generation",
    "Rental record keeping and audit trails",
    "Online rent payment processing via Paystack",
  ],
  userAccounts: [
    "You must provide accurate and complete information when creating your account. You are responsible for keeping your login credentials secure.",
    "You must be at least 18 years of age to create an account.",
    "One account per person. You may not create multiple accounts or share your account with others.",
    "We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or provide false information.",
  ],
  landlordResponsibilities: [
    "Provide accurate property and tenant information",
    "Ensure tenant consent before submitting their information to the platform",
    "Comply with all applicable Nigerian tenancy laws including the tenancy laws of your state",
    "Not use the platform to facilitate illegal rental arrangements",
    "Not discriminate against prospective tenants on grounds prohibited by Nigerian law",
  ],
  tenantResponsibilities: [
    "Provide accurate personal, identity, and guarantor information during onboarding",
    "Not submit forged or fraudulent identity documents",
    "Understand that your submitted information will be visible to the landlord who invited you",
  ],
  agentResponsibilities: [
    "Only list properties for which you have genuine authorisation from the landlord",
    "Provide accurate property and rental information in your listings",
    "Not collect registration fees outside the platform for listings managed through BOPA",
    "Comply with all applicable laws governing real estate agency in Nigeria",
  ],
  payments: [
    "Online rent payments are processed by Paystack. By making a payment through BOPA you agree to Paystack's terms of service.",
    "BOPA charges a platform fee on each online rent payment. This fee is disclosed before payment confirmation.",
    "BOPA does not hold, store, or intermediate rent funds. Payments are settled by Paystack directly to the landlord.",
    "Manual payment records entered by landlords are records only. BOPA is not responsible for their accuracy.",
    "All fees charged by BOPA are as published on boldverseproperty.com at the time of transaction.",
  ],
  businessSubscriptions: [
    "Each property manager or real estate developer company receives two calendar months of free access. No payment method is required to begin the free period.",
    "After the free period, the company subscription costs ₦70,000 monthly or ₦600,000 yearly.",
    "One company subscription covers the company owner and authorised staff members who use that company workspace.",
    "Subscriptions are processed by Paystack and renew automatically at the selected monthly or yearly interval until cancelled.",
    "The company owner may manage or cancel automatic renewal from the subscription page. Cancellation takes effect at the end of the current paid period unless otherwise stated.",
    "If the free period or paid period ends, or a renewal payment fails, workspace features may be restricted until payment is completed. Company records are retained subject to BOPA's data-retention obligations.",
  ],
  tenancy: [
    "Agreements generated through BOPA are based on standard Nigerian tenancy agreement templates.",
    "BOPA does not provide legal advice. Independent legal review is recommended where necessary.",
    "Digital acceptance constitutes acknowledgement by the tenant and is recorded with timestamp and IP address.",
    "BOPA is not responsible for disputes arising from tenancy agreement terms.",
  ],
  liability: [
    "Any loss arising from inaccurate information entered by users",
    "Any dispute between landlords and tenants",
    "Any interruption due to technical maintenance or third-party outages",
    "Any loss of data beyond what can be recovered from backups",
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

function ContactEmail() {
  return (
    <a
      href="mailto:hello@boldverseproperty.com"
      className="font-semibold text-primary hover:underline"
    >
      hello@boldverseproperty.com
    </a>
  );
}

function WebsiteLink() {
  return (
    <a
      href="https://boldverseproperty.com"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary hover:underline"
    >
      boldverseproperty.com
    </a>
  );
}

export default function TermsPage() {
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

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        {/* Hero */}
        <div className="mb-10 border-b border-border-soft pb-10">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <FileCheck2 size={24} strokeWidth={2.6} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Legal
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl">
            Terms and Conditions
          </h1>

          <p className="mt-3 text-sm text-text-muted">
            Boldverse Property (BOPA) &mdash; Last updated: July 2026
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-base leading-8 text-text-normal">
          <PolicySection title="1. About These Terms">
            <p>
              These Terms and Conditions govern your use of Boldverse Property
              (BOPA), a property management platform operated by Boldverse
              Services. By creating an account or using the platform, you agree
              to these terms in full.
            </p>

            <p className="mt-4">
              If you do not agree with any part of these terms, you must not use
              the platform.
            </p>
          </PolicySection>

          <PolicySection title="2. The Platform">
            <p className="mb-4">
              BOPA is a software platform that provides tools for:
            </p>

            <BulletList items={termsData.platformTools} />

            <p className="mt-4">
              BOPA is a software tool and is not a party to tenancy agreements
              created through the platform. All tenancy agreements are directly
              between landlord and tenant.
            </p>
          </PolicySection>

          <PolicySection title="3. User Accounts">
            <BulletList items={termsData.userAccounts} />
          </PolicySection>

          <PolicySection title="4. Landlord Responsibilities">
            <p className="mb-4">As a landlord using BOPA you agree to:</p>

            <BulletList items={termsData.landlordResponsibilities} />

            <p className="mt-4 text-sm text-text-muted">
              BOPA does not verify property information supplied by landlords.
              Landlords are solely responsible for listing and record accuracy.
            </p>
          </PolicySection>

          <PolicySection title="5. Tenant Responsibilities">
            <p className="mb-4">As a tenant using BOPA you agree to:</p>

            <BulletList items={termsData.tenantResponsibilities} />
          </PolicySection>

          <PolicySection title="6. Agent Responsibilities">
            <p className="mb-4">As an agent using BOPA you agree to:</p>

            <BulletList items={termsData.agentResponsibilities} />
          </PolicySection>

          <PolicySection title="7. Payments">
            <BulletList items={termsData.payments} />
          </PolicySection>

          <PolicySection title="8. Manager and Developer Subscriptions">
            <BulletList items={termsData.businessSubscriptions} />
          </PolicySection>

          <PolicySection title="9. Tenancy Agreements">
            <BulletList items={termsData.tenancy} />
          </PolicySection>

          <PolicySection title="10. Intellectual Property">
            <p>
              All platform content, design, and software are the property of
              Boldverse Services. You may not copy, reproduce, or distribute any
              part of the platform without written permission.
            </p>
          </PolicySection>

          <PolicySection title="11. Limitation of Liability">
            <p className="mb-4">
              To the maximum extent permitted by Nigerian law, Boldverse
              Services shall not be liable for:
            </p>

            <BulletList items={termsData.liability} />

            <p className="mt-4">
              Our total liability to you in any circumstance shall not exceed
              the amount you paid to BOPA in the 12 months preceding the claim.
            </p>
          </PolicySection>

          <PolicySection title="12. Termination">
            <p>
              We may suspend or terminate your access to BOPA at any time if you
              breach these terms. You may close your account by contacting us.
              Termination does not affect records retained under our data
              retention obligations.
            </p>
          </PolicySection>

          <PolicySection title="13. Governing Law">
            <p>
              These Terms and Conditions are governed by the laws of the Federal
              Republic of Nigeria. Any disputes shall be subject to Nigerian
              court jurisdiction.
            </p>
          </PolicySection>

          <PolicySection title="14. Changes to These Terms">
            <p>
              We may update these terms from time to time. Registered users will
              be notified of material changes at least 14 days before they take
              effect. Continued use after changes take effect constitutes
              acceptance.
            </p>
          </PolicySection>

          <PolicySection title="15. Contact">
            <p>
              Email: <ContactEmail />
            </p>

            <p className="mt-2">
              Website: <WebsiteLink />
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

            <Link href="/terms" className="font-semibold text-primary">
              Terms & Conditions
            </Link>

            <Link
              href="/refund-policy"
              className="transition-colors hover:text-text-strong"
            >
              Refund Policy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
