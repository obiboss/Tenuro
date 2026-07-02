import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Developer3DShowcase } from "@/components/developer/developer-3d-showcase";
import { LandingHeaderLogin } from "@/components/landing/landing-header-login";
import { LandingHeroRotator } from "@/components/landing/landing-hero-rotator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Keep tenant records properly",
    description:
      "Store tenant details, guarantor information, rental agreement details, and documents in one organised place.",
    icon: Users,
  },
  {
    title: "Track rent payments clearly",
    description:
      "Record manual bank transfers, cash payments, and online payments with a clear payment history.",
    icon: ReceiptText,
  },
  {
    title: "Generate receipts automatically",
    description:
      "Create professional rent receipts tenants can receive by WhatsApp after payment is confirmed.",
    icon: FileCheck2,
  },
  {
    title: "Manage tenancy agreements digitally",
    description:
      "Prepare, send, and track tenancy agreements with clear tenant acceptance records.",
    icon: ShieldCheck,
  },
  {
    title: "Built for Nigerian landlords",
    description:
      "Designed around Nigerian rental workflows, annual rent records, NGN payments, and WhatsApp-first communication.",
    icon: Building2,
  },
];

const publicTools = [
  {
    title: "Free Rent Receipt Generator",
    description:
      "Create a clean Nigerian rent receipt, download a watermarked PDF, share it on WhatsApp, then create an account to save it.",
    href: "/receipt-generator",
    icon: ReceiptText,
    cta: "Generate Receipt",
  },
  {
    title: "Free Tenancy Agreement Generator",
    description:
      "Generate a tenancy agreement preview, download the PDF, share it, and attach the agreement to your landlord account.",
    href: "/agreement-generator",
    icon: FileText,
    cta: "Generate Agreement",
  },
];

const workspaceCards = [
  {
    title: "Landlord",
    description: "Manage tenants, rent records, receipts, and agreements.",
    href: "/register?role=landlord",
    icon: Building2,
  },
  {
    title: "Agent",
    description: "Submit properties and manage tenant application workflows.",
    href: "/register?role=agent",
    icon: Users,
  },
  {
    title: "Developer",
    description: "Manage estates, plots, buyers, installments, and documents.",
    href: "/developers",
    icon: Landmark,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-7xl flex-col px-4 py-8 md:px-8 lg:py-10">
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

          <div className="flex shrink-0 items-center">
            <LandingHeaderLogin />
          </div>
        </header>

        <LandingHeroRotator />

        <section className="rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">Choose your workspace</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              Use BOPA for the property work you actually do.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              Whether you manage tenants, sell plots, or coordinate property
              records, BOPA gives you a cleaner way to organise the work.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {workspaceCards.map((workspace) => {
              const Icon = workspace.icon;

              return (
                <Link
                  key={workspace.title}
                  href={workspace.href}
                  className="group rounded-card border border-border-soft bg-background p-5 transition hover:border-primary/40 hover:bg-primary-soft/40 md:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" size={24} strokeWidth={2.6} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-black tracking-tight text-text-strong">
                        {workspace.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {workspace.description}
                      </p>

                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary group-hover:text-primary-hover">
                        {workspace.title === "Developer"
                          ? "Explore Developer Tools"
                          : `Sign up as ${workspace.title}`}
                        <ArrowRight
                          aria-hidden="true"
                          size={17}
                          strokeWidth={2.6}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">Free landlord tools</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              Start with a receipt or agreement before creating an account.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              Use BOPA&apos;s free public tools to generate a rent receipt or
              tenancy agreement first. Download the document, share it on
              WhatsApp, then create a free landlord account only when you want
              to save the record.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {publicTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-card border border-border-soft bg-background p-5 transition hover:border-primary/40 hover:bg-primary-soft/40 md:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" size={24} strokeWidth={2.6} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-black tracking-tight text-text-strong">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {tool.description}
                      </p>

                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary group-hover:text-primary-hover">
                        {tool.cta}
                        <ArrowRight
                          aria-hidden="true"
                          size={17}
                          strokeWidth={2.6}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <Developer3DShowcase />
        </section>

        <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              Meet BOPA — Boldverse Property App
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA is a Nigerian property management platform built for
              landlords, agents, caretakers, and real estate developers. Track
              who has paid, know who is owing, send professional receipts,
              manage tenancy records, and organise estate sales operations from
              one clean platform.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon aria-hidden="true" size={24} strokeWidth={2.6} />
                  </div>

                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </section>

        <footer className="mt-16 border-t border-border-soft pt-8 pb-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Boldverse Services. All rights
              reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-text-muted sm:justify-end">
              <Link
                href="/blog"
                className="transition-colors hover:text-text-strong"
              >
                Blog
              </Link>

              <Link
                href="/privacy"
                className="transition-colors hover:text-text-strong"
              >
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
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
