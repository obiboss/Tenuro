import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, MapPin, ShieldCheck } from "lucide-react";
import { ReceiptGeneratorForm } from "@/components/public-tools/receipt-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  getReceiptGeneratorLocation,
  receiptGeneratorLocations,
} from "@/lib/receipt-generator-locations";

type LocationPageProps = {
  params: Promise<{
    location: string;
  }>;
};

export function generateStaticParams() {
  return receiptGeneratorLocations.map((location) => ({
    location: location.slug,
  }));
}

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { location } = await params;
  const page = getReceiptGeneratorLocation(location);

  if (!page) {
    return {
      title: "Receipt Generator | BOPA",
    };
  }

  return {
    title: page.title,

    description: page.description,

    keywords: [
      page.seoKeyword,
      `rent receipt ${page.label}`,
      `landlord receipt ${page.label}`,
      `rent receipt generator ${page.state}`,
      "rent receipt Nigeria",
    ],

    alternates: {
      canonical: `https://boldverseproperty.com/receipt-generator/${page.slug}`,
    },

    openGraph: {
      title: `${page.title} | BOPA`,
      description: page.description,
      url: `https://boldverseproperty.com/receipt-generator/${page.slug}`,
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: `${page.title} | BOPA`,
      description: page.description,
    },
  };
}

export default async function LocalReceiptGeneratorPage({
  params,
}: LocationPageProps) {
  const { location } = await params;
  const page = getReceiptGeneratorLocation(location);

  if (!page) {
    notFound();
  }

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

          <Link href="/register" className="hidden sm:block">
            <Button variant="secondary">
              Create Account
              <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
            </Button>
          </Link>
        </header>

        <div className="py-12 lg:py-16">
          <Badge tone="primary" size="md">
            {page.seoKeyword}
          </Badge>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
                {page.title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
                {page.description} BOPA calculates rent periods for Nigerian
                annual rent, six-month rent, and two-year rent payments.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
                {page.intro}
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title={`Built for ${page.label} landlords`}
                description="Generate the receipt first. Create an account later only when you want to save receipt history and track tenants."
                icon={<MapPin aria-hidden="true" size={22} strokeWidth={2.6} />}
              />

              <TrustNotice
                title="Professional tenant record"
                description="Each generated receipt includes landlord, tenant, property, payment amount, payment method, and rent-period details."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>
        </div>

        <ReceiptGeneratorForm
          sourcePath={`/receipt-generator/${location}`}
          sourceLocation={page.label}
        />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-card bg-surface p-5 shadow-card md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-text-strong">
              {page.seoKeyword} for Nigerian landlords
            </h2>

            <p className="mt-4 text-sm leading-7 text-text-muted md:text-base">
              Use BOPA to create rent receipts for tenants in {page.label},{" "}
              {page.state}. This free public tool supports rent receipt template
              Nigeria, landlord receipt Nigeria, tenant payment receipt, annual
              rent receipt, and property payment record workflows.
            </p>

            <div className="mt-6 grid gap-3">
              {page.useCases.map((useCase) => (
                <div
                  key={useCase}
                  className="flex items-start gap-3 rounded-button bg-background p-4"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <FileText aria-hidden="true" size={17} strokeWidth={2.6} />
                  </div>

                  <p className="text-sm font-semibold leading-6 text-text-muted">
                    {useCase}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card bg-primary p-5 text-white shadow-card md:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-white/75">
              After generating
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Save receipts inside your BOPA dashboard.
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/80">
              After creating a receipt, landlords can create a free account from
              the generated receipt and keep the imported receipt attached to
              their profile for review.
            </p>

            <div className="mt-6">
              <Link href="/receipt-generator">
                <Button variant="secondary" fullWidth>
                  Open Main Receipt Generator
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
