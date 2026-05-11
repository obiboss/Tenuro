import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, MapPin, ShieldCheck } from "lucide-react";
import { AgreementGeneratorForm } from "@/components/public-tools/agreement-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  agreementGeneratorLocations,
  getAgreementGeneratorLocation,
} from "@/lib/agreement-generator-seo";

type LocalAgreementGeneratorPageProps = {
  params: Promise<{
    location: string;
  }>;
};

export function generateStaticParams() {
  return agreementGeneratorLocations.map((location) => ({
    location: location.slug,
  }));
}

export async function generateMetadata({
  params,
}: LocalAgreementGeneratorPageProps): Promise<Metadata> {
  const { location } = await params;
  const page = getAgreementGeneratorLocation(location);

  if (!page) {
    return {
      title: "Tenancy Agreement Generator | BOPA",
    };
  }

  return {
    title: `${page.title} | BOPA`,
    description: page.description,

    alternates: {
      canonical: `https://boldverseproperty.com/agreement-generator/${page.slug}`,
    },

    openGraph: {
      title: `${page.title} | BOPA`,
      description: page.description,
      url: `https://boldverseproperty.com/agreement-generator/${page.slug}`,
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: `${page.title} | BOPA`,
      description: page.description,
    },
  };
}

export default async function LocalAgreementGeneratorPage({
  params,
}: LocalAgreementGeneratorPageProps) {
  const { location } = await params;
  const page = getAgreementGeneratorLocation(location);

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

          <Link href="/receipt-generator" className="hidden sm:block">
            <Button variant="secondary">
              Generate Receipt
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
                {page.description} BOPA helps landlords prepare agreement
                previews with landlord details, tenant details, premises, rent,
                tenancy term, property requirements, and signature sections.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
                {page.intro}
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title={`Built for ${page.label} landlords`}
                description="Generate the agreement first. Download a watermarked PDF, share it on WhatsApp, or create an account to save the agreement."
                icon={<MapPin aria-hidden="true" size={22} strokeWidth={2.6} />}
              />

              <TrustNotice
                title="Nigerian tenancy structure"
                description="The agreement preview includes parties, premises, rent clause, tenant obligations, landlord obligations, digital record clause, and signature section."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>
        </div>

        <AgreementGeneratorForm
          sourcePath={`/agreement-generator/${location}`}
        />

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-card bg-surface p-5 shadow-card md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-text-strong">
              {page.seoKeyword} for Nigerian landlords
            </h2>

            <p className="mt-4 text-sm leading-7 text-text-muted md:text-base">
              Use BOPA to create tenancy agreement previews for properties in{" "}
              {page.label}, {page.state}. This public tool supports tenancy
              agreement Nigeria, landlord agreement Nigeria, rent agreement PDF
              Nigeria, annual rent agreement, and Nigerian property agreement
              workflows.
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
              Save agreements inside your BOPA dashboard.
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/80">
              After generating a public agreement, landlords can create a free
              account from the agreement and keep it attached to their property
              and tenant record for review.
            </p>

            <div className="mt-6">
              <Link href="/agreement-generator">
                <Button variant="secondary" fullWidth>
                  Open Main Agreement Generator
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
