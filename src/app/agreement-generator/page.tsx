import type { Metadata } from "next";
import Link from "next/link";
import { AgreementGeneratorForm } from "@/components/public-tools/agreement-generator-form";
import { Badge } from "@/components/ui/badge";
import {
  getFeaturedAgreementGeneratorLocations,
  getFeaturedAgreementGeneratorTemplates,
} from "@/lib/agreement-generator-seo";

export const metadata: Metadata = {
  title: "Free Tenancy Agreement Generator Nigeria",

  description:
    "Generate Nigerian tenancy agreement previews online. Download watermarked PDF agreements, share via WhatsApp, and save agreements to your BOPA account.",

  keywords: [
    "tenancy agreement Nigeria",
    "rental agreement generator Nigeria",
    "lease agreement Nigeria",
    "landlord agreement Lagos",
    "tenant agreement PDF Nigeria",
    "property agreement template Nigeria",
  ],

  alternates: {
    canonical: "https://boldverseproperty.com/agreement-generator",
  },

  openGraph: {
    title: "Free Tenancy Agreement Generator Nigeria | BOPA",
    description:
      "Generate Nigerian tenancy agreement previews online with PDF download support.",
    url: "https://boldverseproperty.com/agreement-generator",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Tenancy Agreement Generator Nigeria | BOPA",
    description:
      "Create Nigerian tenancy agreement previews online using BOPA.",
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

          <Link href="/receipt-generator" className="text-sm font-bold text-primary hover:underline">
            Need a rent receipt instead? →
          </Link>
        </header>

        <div className="py-9 lg:py-12">
          <Badge tone="primary" size="md">
            Free tenancy agreement generator Nigeria
          </Badge>

          <div className="mt-6 max-w-3xl">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl">
                Make a tenancy agreement in minutes.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
                Fill in four short sections, preview your agreement, then
                download it. It takes about 3 minutes and needs no account.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-text-strong">
            <span>✓ First 3 agreements free</span>
            <span>✓ No sign-up</span>
            <span>✓ Review details before creating</span>
          </div>
        </div>

        <AgreementGeneratorForm sourcePath="/agreement-generator" />

        <section className="mt-8 border-t border-border-soft pt-6">
          <h2 className="text-sm font-bold text-text-strong">Tenancy agreements by city</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {featuredLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/agreement-generator/${location.slug}`}
                className="rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary-soft"
              >
                {location.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-text-strong">Agreement types</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {featuredTemplates.map((template) => (
              <Link
                key={template.slug}
                href={`/agreement-generator/templates/${template.slug}`}
                className="rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary-soft"
              >
                {template.label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 text-sm text-text-muted">
          BOPA helps landlords prepare tenancy agreements for flats, rooms,
          apartments, shops and offices in Nigeria.
        </p>
      </section>
    </main>
  );
}
