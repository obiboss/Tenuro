import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { ReceiptGeneratorForm } from "@/components/public-tools/receipt-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";

type LocationPageProps = {
  params: Promise<{
    location: string;
  }>;
};

const locationCopy: Record<
  string,
  {
    label: string;
    title: string;
    description: string;
    seoKeyword: string;
  }
> = {
  lagos: {
    label: "Lagos",
    title: "Free Rent Receipt Generator Lagos",
    description:
      "Generate a clean rent receipt for Lagos landlords managing flats, apartments, shops, and annual tenant payments.",
    seoKeyword: "rent receipt generator Lagos",
  },
  abuja: {
    label: "Abuja",
    title: "Free Rent Receipt Generator Abuja",
    description:
      "Create a professional rent receipt for Abuja landlords and tenants without signing up first.",
    seoKeyword: "rent receipt generator Abuja",
  },
  "port-harcourt": {
    label: "Port Harcourt",
    title: "Free Rent Receipt Generator Port Harcourt",
    description:
      "Prepare a clear rent payment receipt for Port Harcourt landlords, tenants, and property managers.",
    seoKeyword: "rent receipt generator Port Harcourt",
  },
};

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { location } = await params;
  const page = locationCopy[location];

  if (!page) {
    return {
      title: "Receipt Generator | BOPA",
    };
  }

  return {
    title: `${page.title} | BOPA`,
    description: page.description,
    openGraph: {
      title: `${page.title} | BOPA`,
      description: page.description,
      type: "website",
    },
  };
}

export default async function LocalReceiptGeneratorPage({
  params,
}: LocationPageProps) {
  const { location } = await params;
  const page = locationCopy[location];

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
            </div>

            <div className="space-y-4">
              <TrustNotice
                title={`Built for ${page.label} landlords`}
                description="Generate the receipt first. Create an account later only when you want to save receipt history and track tenants."
                icon={
                  <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />

              <TrustNotice
                title="Professional tenant record"
                description="Each generated receipt includes landlord, tenant, property, payment amount, and rent period details."
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

        <section className="mt-12 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            {page.seoKeyword} for Nigerian landlords
          </h2>

          <p className="mt-4 text-sm leading-7 text-text-muted md:text-base">
            Use BOPA to create rent receipts for tenants in {page.label}. This
            free public tool supports rent receipt template Nigeria, landlord
            receipt Nigeria, tenant payment receipt, and annual rent receipt
            workflows.
          </p>
        </section>
      </section>
    </main>
  );
}
