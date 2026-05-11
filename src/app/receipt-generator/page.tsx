import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { ReceiptGeneratorForm } from "@/components/public-tools/receipt-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getFeaturedReceiptGeneratorLocations } from "@/lib/receipt-generator-locations";

export const metadata: Metadata = {
  title: "Free Rent Receipt Generator Nigeria",

  description:
    "Generate professional Nigerian rent receipts online for landlords and tenants. Create PDF rent payment receipts for Lagos, Abuja, Port Harcourt, and all Nigerian states.",

  keywords: [
    "rent receipt generator Nigeria",
    "rent receipt Lagos",
    "tenant payment receipt Nigeria",
    "landlord receipt template Nigeria",
    "receipt generator Abuja",
    "rent receipt PDF Nigeria",
  ],

  alternates: {
    canonical: "https://boldverseproperty.com/receipt-generator",
  },

  openGraph: {
    title: "Free Rent Receipt Generator Nigeria | BOPA",
    description:
      "Generate professional Nigerian rent receipts online and download PDF copies instantly.",
    url: "https://boldverseproperty.com/receipt-generator",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Rent Receipt Generator Nigeria | BOPA",
    description:
      "Generate Nigerian landlord rent receipts online with PDF download support.",
  },
};

export default function ReceiptGeneratorPage() {
  const featuredLocations = getFeaturedReceiptGeneratorLocations();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
              B
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
                Boldverse Property
              </p>
              <p className="truncate text-xs font-semibold text-text-muted">
                Property Management for Modern Landlords
              </p>
            </div>
          </Link>

          <Link href="/agreement-generator" className="hidden sm:block">
            <Button variant="secondary">
              Generate Agreement
              <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
            </Button>
          </Link>
        </header>

        <div className="py-12 lg:py-16">
          <Badge tone="primary" size="md">
            Free rent receipt generator Nigeria
          </Badge>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
                Generate a clean Nigerian rent receipt in minutes.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
                Create a professional rent payment receipt for tenants without
                signing up first. Enter the landlord, tenant, property, and
                payment details, then BOPA calculates the rent period for you.
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title="Value first, signup later"
                description="Generate your first receipt without creating an account. After that, you can save records by creating a free BOPA account."
                icon={
                  <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />

              <TrustNotice
                title="Built for annual rent"
                description="Supports Nigerian rent patterns like 6 months, 1 year, and 2 years with automatic end-date calculation."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>
        </div>

        <ReceiptGeneratorForm sourcePath="/receipt-generator" />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-card bg-surface p-5 shadow-card md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-text-strong">
              Rent receipt generator for Nigerian landlords
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-text-muted md:text-base">
              <p>
                BOPA helps landlords create rent receipts for tenant payments,
                annual rent, six-month rent, bank transfer payments, cash
                payments, and Paystack payments.
              </p>

              <p>
                Use this free receipt generator for rent payment receipt
                Nigeria, landlord receipt Nigeria, rent receipt template
                Nigeria, and rent tracking Lagos workflows.
              </p>
            </div>
          </div>

          <div className="rounded-card bg-primary p-5 text-white shadow-card md:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-white/75">
              Need an agreement too?
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Generate a tenancy agreement preview.
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/80">
              After preparing the receipt, you can also generate a Nigerian
              tenancy agreement, download the PDF, share it on WhatsApp, and
              save it to your BOPA account.
            </p>

            <div className="mt-6">
              <Link href="/agreement-generator">
                <Button variant="secondary" fullWidth>
                  Open Agreement Generator
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            Popular rent receipt generator locations
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
            Choose a location page for more specific receipt guidance, or use
            the main generator above for any Nigerian city.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/receipt-generator/${location.slug}`}
                className="rounded-button border border-border-soft bg-background p-4 transition hover:border-primary/40 hover:bg-primary-soft"
              >
                <p className="font-black text-text-strong">{location.label}</p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {location.seoKeyword}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
