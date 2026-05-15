import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Boldverse Property",
  description:
    "Privacy Policy for Boldverse Property (BOPA) — how we collect, use, protect, and retain your information.",
  alternates: {
    canonical: "https://boldverseproperty.com/privacy",
  },
};

const privacyData = {
  landlords: [
    "Full name, phone number, and email address",
    "Property details including address, state, and local government area",
    "Bank account details for Paystack subaccount setup",
    "Tenant records created within the platform",
  ],
  tenants: [
    "Full name, phone number, and email address",
    "Date of birth and home address",
    "Occupation and employer information",
    "Government-issued ID type and number",
    "ID document uploads and passport photograph",
    "Guarantor name, phone number, address, and relationship",
    "Guarantor ID document uploads",
  ],
  agents: [
    "Full name, phone number, and email address",
    "Business name where applicable",
    "Bank account details for Paystack subaccount setup",
  ],
  automatic: [
    "IP address at the time of account activity and document acceptance",
    "Device type and browser information",
    "Usage activity within the platform",
  ],
  usage: [
    "Create and manage your account on the platform",
    "Process rent payments through Paystack on your behalf",
    "Generate tenancy agreements and rent receipts",
    "Maintain rental records and payment history",
    "Send notifications via WhatsApp about rent due dates, receipts, and renewals",
    "Verify identity for tenant KYC purposes",
    "Comply with legal and regulatory obligations",
    "Investigate disputes and provide audit records where required",
  ],
  kyc: [
    "Accessible only to the landlord who onboarded the tenant and to the tenant themselves",
    "Never shared with third parties except as required by law",
    "Retained for the duration of the tenancy and for 3 years after the tenancy ends for audit and dispute purposes",
  ],
  security: [
    "All data is transmitted over HTTPS encryption",
    "Database access is protected by row-level security policies",
    "Sensitive fields including ID numbers are encrypted at the application level",
    "Access tokens and onboarding links are stored as cryptographic hashes — raw values are never retained",
    "Session tokens are stored in secure httpOnly cookies and never in browser storage",
  ],
  retention: [
    "Landlord account data is retained for 3 years for tax and audit compliance after account closure",
    "Tenant records are retained for 3 years after the tenancy ends",
    "Payment records and receipts are retained for 7 years in compliance with Nigerian financial record-keeping requirements",
    "Audit logs are retained permanently as part of the legal record of transactions",
  ],
  rights: [
    "Access the personal information we hold about you",
    "Request correction of inaccurate information",
    "Request deletion of your account and associated data, subject to retention obligations",
    "Receive a copy of your data in a readable format",
  ],
  sharing: [
    {
      title: "Paystack",
      desc: "We share necessary transaction details with Paystack to process rent payments. Paystack's privacy policy governs their use of this information.",
    },
    {
      title: "Supabase",
      desc: "Our database and file storage infrastructure is provided by Supabase. Data is stored on their servers under our control.",
    },
    {
      title: "Between platform users",
      desc: "Landlords can see tenant profile information for tenants on their properties. Tenants can see only their own records. Agents can see property and tenant pipeline information for listings they manage.",
    },
    {
      title: "Legal requirements",
      desc: "We may disclose information if required by Nigerian law, court order, or regulatory authority.",
    },
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

export default function PrivacyPolicyPage() {
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
            <ShieldCheck size={24} strokeWidth={2.6} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Legal
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-text-muted">
            Boldverse Property (BOPA) &mdash; Last updated: May 2026
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-base leading-8 text-text-normal">
          <PolicySection title="1. Who We Are">
            <p>
              Boldverse Property (BOPA) is a property management platform
              operated by Boldverse Services in Nigeria. BOPA helps landlords,
              tenants, and agents manage rental properties, tenancy agreements,
              rent payments, and related records.
            </p>

            <p className="mt-4">
              You can contact us at <ContactEmail /> or through <WebsiteLink />.
            </p>
          </PolicySection>

          <PolicySection title="2. What Information We Collect">
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 font-bold text-text-strong">
                  From Landlords
                </h3>
                <BulletList items={privacyData.landlords} />
              </div>

              <div>
                <h3 className="mb-3 font-bold text-text-strong">
                  From Tenants
                </h3>
                <BulletList items={privacyData.tenants} />
              </div>

              <div>
                <h3 className="mb-3 font-bold text-text-strong">From Agents</h3>
                <BulletList items={privacyData.agents} />
              </div>

              <div>
                <h3 className="mb-3 font-bold text-text-strong">
                  Automatically Collected
                </h3>
                <BulletList items={privacyData.automatic} />
              </div>
            </div>
          </PolicySection>

          <PolicySection title="3. How We Use Your Information">
            <BulletList items={privacyData.usage} />
          </PolicySection>

          <PolicySection title="4. How We Share Your Information">
            <p className="mb-4 font-semibold text-text-strong">
              We do not sell your personal information to third parties under
              any circumstances.
            </p>

            <p className="mb-4">
              We share information only in the following limited circumstances:
            </p>

            <ul className="space-y-3 pl-5">
              {privacyData.sharing.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-semibold text-text-strong">
                      {item.title}
                    </span>{" "}
                    &mdash; {item.desc}
                  </span>
                </li>
              ))}
            </ul>
          </PolicySection>

          <PolicySection title="5. Tenant KYC Documents">
            <p className="mb-4">
              Tenant identity documents including ID uploads, passport
              photographs, and guarantor documents are stored securely on our
              platform. These documents are:
            </p>

            <BulletList items={privacyData.kyc} />
          </PolicySection>

          <PolicySection title="6. Data Security">
            <BulletList items={privacyData.security} />
          </PolicySection>

          <PolicySection title="7. Data Retention">
            <BulletList items={privacyData.retention} />
          </PolicySection>

          <PolicySection title="8. Your Rights">
            <p className="mb-4">You have the right to:</p>

            <BulletList items={privacyData.rights} />

            <p className="mt-4">
              To exercise any of these rights, contact us at <ContactEmail />.
            </p>
          </PolicySection>

          <PolicySection title="9. Cookies">
            <p>
              BOPA uses only essential session cookies required for
              authentication. We do not use tracking cookies, advertising
              cookies, or third-party analytics cookies.
            </p>
          </PolicySection>

          <PolicySection title="10. Contact">
            <p className="mb-2">For privacy-related questions or requests:</p>

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
            <Link href="/privacy" className="font-semibold text-primary">
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-text-strong"
            >
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
