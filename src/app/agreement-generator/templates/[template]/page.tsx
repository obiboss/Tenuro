import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { AgreementGeneratorForm } from "@/components/public-tools/agreement-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  agreementGeneratorTemplates,
  getAgreementGeneratorTemplate,
} from "@/lib/agreement-generator-seo";

type AgreementTemplatePageProps = {
  params: Promise<{
    template: string;
  }>;
};

export function generateStaticParams() {
  return agreementGeneratorTemplates.map((template) => ({
    template: template.slug,
  }));
}

export async function generateMetadata({
  params,
}: AgreementTemplatePageProps): Promise<Metadata> {
  const { template } = await params;
  const page = getAgreementGeneratorTemplate(template);

  if (!page) {
    return {
      title: "Tenancy Agreement Template | BOPA",
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

export default async function AgreementTemplatePage({
  params,
}: AgreementTemplatePageProps) {
  const { template } = await params;
  const page = getAgreementGeneratorTemplate(template);

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
                {page.description} BOPA generates a structured agreement preview
                you can download as a watermarked PDF, share on WhatsApp, or
                attach to your landlord account.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
                {page.intro}
              </p>
            </div>

            <div className="space-y-4">
              <TrustNotice
                title={page.label}
                description="Generate the agreement without signup. Create a free account only after the agreement is ready."
                icon={
                  <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />

              <TrustNotice
                title="Watermarked public PDF"
                description="Free public agreements remain watermarked. Account saving and future pro editing build on this generated document."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>
        </div>

        <AgreementGeneratorForm
          sourcePath={`/agreement-generator/templates/${template}`}
        />

        <section className="mt-12 rounded-card bg-surface p-5 shadow-card md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-text-strong">
            {page.seoKeyword} template use cases
          </h2>

          <p className="mt-4 text-sm leading-7 text-text-muted md:text-base">
            This BOPA template page helps Nigerian landlords prepare agreement
            previews for common rental situations. The same agreement generator
            can be used for residential, commercial, shop, office, flat, and
            annual rent arrangements.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {page.useCases.map((useCase) => (
              <div key={useCase} className="rounded-button bg-background p-4">
                <p className="text-sm font-semibold leading-6 text-text-muted">
                  {useCase}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
