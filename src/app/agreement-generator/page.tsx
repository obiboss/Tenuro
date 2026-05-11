import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { AgreementGeneratorForm } from "@/components/public-tools/agreement-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";

export const metadata: Metadata = {
  title: "Free Tenancy Agreement Generator Nigeria | BOPA",
  description:
    "Generate a tenancy agreement preview for Nigerian landlords. Prepare landlord, tenant, property, rent, deposit, and tenancy term details before saving or downloading.",
  openGraph: {
    title: "Free Tenancy Agreement Generator Nigeria | BOPA",
    description:
      "Create a structured tenancy agreement preview for Nigerian landlords before creating a BOPA account.",
    type: "website",
  },
};

export default function AgreementGeneratorPage() {
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
                Enter the landlord, tenant, property, rent, deposit, and tenancy
                terms. BOPA prepares a structured agreement preview and saves
                the snapshot for the next agreement workflow.
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title="Value first, signup later"
                description="Generate an agreement preview without creating an account. PDF download and account saving come in the next agreement batches."
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
            Tenancy agreement generator for Nigerian landlords
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-text-muted md:text-base">
            <p>
              BOPA helps landlords prepare tenancy agreement details for flats,
              rooms, apartments, shops, offices, and mixed-use rental spaces.
            </p>

            <p>
              Use this public agreement generator to structure rent amount,
              caution deposit, tenancy start date, renewal notice, landlord
              details, tenant details, and property details before saving the
              agreement formally.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
