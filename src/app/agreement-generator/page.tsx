import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, MapPin, ShieldCheck } from "lucide-react";
import { AgreementGeneratorForm } from "@/components/public-tools/agreement-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  getFeaturedAgreementGeneratorLocations,
  getFeaturedAgreementGeneratorTemplates,
} from "@/lib/agreement-generator-seo";

export const metadata: Metadata = {
  title: "Free Tenancy Agreement Generator Nigeria | BOPA",
  description:
    "Generate a tenancy agreement preview for Nigerian landlords. Create a watermarked PDF, share on WhatsApp, and save agreement data to a BOPA landlord account.",
  openGraph: {
    title: "Free Tenancy Agreement Generator Nigeria | BOPA",
    description:
      "Create a structured tenancy agreement preview for Nigerian landlords before creating a BOPA account.",
    type: "website",
  },
};

export default function AgreementGeneratorPage() {
  const featuredLocations = getFeaturedAgreementGeneratorLocations();
  const featuredTemplates = getFeaturedAgreementGeneratorTemplates();

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

          <Link href="/receipt-generator" className="hidden sm:block">
            <Button variant="secondary">
              Generate Receipt
              <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
            </Button>
          </Link>
        </header>

        <div className="py-12 lg:py-16">
          <Badge tone="primary" size="md">
            Free tenancy agreement generator Nigeria
          </Badge>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
                Generate a Nigerian tenancy agreement preview in minutes.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
                Enter the landlord, tenant, property, rent, deposit, tenancy
                term, property requirements, and special terms. BOPA prepares a
                structured tenancy agreement preview you can download, share, or
                save to a landlord account.
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title="Value first, signup later"
                description="Generate an agreement preview without creating an account. Download the watermarked PDF, share it, then create an account only when you want to save it."
                icon={
                  <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />

              <TrustNotice
                title="Built for Nigerian rent terms"
                description="Supports annual, six-month, and two-year tenancy periods with automatic end-date calculation."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>
        </div>

        <AgreementGeneratorForm sourcePath="/agreement-generator" />

        <section className="mt-12 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            Popular tenancy agreement locations
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
            Choose a location page for more specific agreement guidance, or use
            the main generator above for any Nigerian city.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/agreement-generator/${location.slug}`}
                className="rounded-button border border-border-soft bg-background p-4 transition hover:border-primary/40 hover:bg-primary-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <MapPin aria-hidden="true" size={18} strokeWidth={2.6} />
                  </div>

                  <div>
                    <p className="font-black text-text-strong">
                      {location.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      {location.seoKeyword}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            Tenancy agreement templates
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
            These template pages help landlords find the agreement generator by
            common rental document needs.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTemplates.map((template) => (
              <Link
                key={template.slug}
                href={`/agreement-generator/templates/${template.slug}`}
                className="rounded-button border border-border-soft bg-background p-4 transition hover:border-primary/40 hover:bg-primary-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <FileText aria-hidden="true" size={18} strokeWidth={2.6} />
                  </div>

                  <div>
                    <p className="font-black text-text-strong">
                      {template.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      {template.seoKeyword}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            Tenancy agreement generator for Nigerian landlords
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-text-muted md:text-base">
            <p>
              BOPA helps landlords prepare tenancy agreement previews for flats,
              rooms, apartments, shops, offices, and mixed-use rental spaces.
            </p>

            <p>
              Use this public agreement generator to structure rent amount,
              caution deposit, tenancy start date, renewal notice, landlord
              details, tenant details, property details, property rules, and
              special agreement clauses before saving the agreement formally.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
