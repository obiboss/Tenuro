import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";

export const metadata: Metadata = {
  title: "Free Tenancy Agreement Generator Nigeria | BOPA",
  description:
    "BOPA tenancy agreement generator for Nigerian landlords is coming soon. Create rent receipts now and manage landlord records with Boldverse Property.",
};

export default function AgreementGeneratorPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8 lg:py-10">
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

        <div className="py-16 lg:py-24">
          <p className="text-sm font-extrabold uppercase tracking-wide text-primary">
            Tenancy agreement generator Nigeria
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl">
            Free tenancy agreement generator is coming soon.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
            BOPA is preparing a Nigerian tenancy agreement generator for
            landlords who need clear, professional agreement documents. For now,
            you can generate a rent receipt without creating an account.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/receipt-generator">
              <Button size="lg">
                Generate Rent Receipt
                <FileText aria-hidden="true" size={18} strokeWidth={2.6} />
              </Button>
            </Link>

            <Link href="/register">
              <Button size="lg" variant="secondary">
                Create BOPA Account
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TrustNotice
            title="Built for Nigerian landlords"
            description="The agreement generator will support Nigerian tenancy details, landlord and tenant records, rent terms, and professional PDF output."
            icon={
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />

          <TrustNotice
            title="Receipt generator is available now"
            description="Use the free receipt generator today to create clean tenant rent payment receipts."
            icon={<FileText aria-hidden="true" size={22} strokeWidth={2.6} />}
          />
        </div>
      </section>
    </main>
  );
}
