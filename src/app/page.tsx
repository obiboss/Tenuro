import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  FileText,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { TrustNotice } from "@/components/ui/trust-notice";

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

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/agent/login" className="hidden sm:block">
              <Button variant="secondary">Agent Login</Button>
            </Link>

            <Link href="/login">
              <Button>Login</Button>
            </Link>
          </div>
        </header>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <Badge tone="primary" size="md">
              Built for Nigerian landlords
            </Badge>

            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
              Manage tenants, rent payments, and receipts without confusion.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted md:text-lg">
              BOPA — Boldverse Property App — helps landlords keep proper rental
              records, track who has paid, know who is owing, and send clear
              receipts without relying on notebooks or scattered WhatsApp
              messages.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <Link href="/receipt-generator">
                <Button size="lg" fullWidth>
                  Generate Free Receipt
                  <ReceiptText aria-hidden="true" size={18} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/agreement-generator">
                <Button size="lg" variant="secondary" fullWidth>
                  Generate Agreement
                  <FileText aria-hidden="true" size={18} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/register">
                <Button size="lg" variant="secondary" fullWidth>
                  Register as Landlord
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/agent/register">
                <Button size="lg" variant="ghost" fullWidth>
                  Register as Agent
                  <BadgeCheck aria-hidden="true" size={18} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/login">
                <Button size="lg" variant="ghost" fullWidth>
                  Landlord Login
                </Button>
              </Link>

              <Link href="/agent/login">
                <Button size="lg" variant="ghost" fullWidth>
                  Agent Login
                </Button>
              </Link>
            </div>

            <div className="mt-8">
              <TrustNotice
                title="Designed for proper landlord records"
                description="Boldverse Property keeps a clear history of every payment, correction, tenant profile, and receipt."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>

          <div className="rounded-4xl bg-surface p-5 shadow-card md:p-6">
            <div className="rounded-3xl bg-background p-5">
              <div className="grid gap-4">
                <StatCard
                  title="Total Units"
                  value="24"
                  description="Across 4 properties"
                  icon={<Building2 size={22} strokeWidth={2.6} />}
                />

                <StatCard
                  title="Tenants"
                  value="21"
                  description="Active rental records"
                  tone="success"
                  icon={<Users size={22} strokeWidth={2.6} />}
                />

                <StatCard
                  title="Rent Collected"
                  value="₦18.6M"
                  description="Track annual rent payments"
                  tone="gold"
                  icon={<ReceiptText size={22} strokeWidth={2.6} />}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
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

        <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              Meet BOPA — Boldverse Property App
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA is a Nigerian property management platform built for
              independent landlords managing rental properties in Lagos and
              across Nigeria. Track who has paid, know who is owing, send
              professional receipts, and manage tenancy agreements — all from
              your phone.
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

        {/* Footer */}
        <footer className="mt-16 border-t border-border-soft pt-8 pb-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Boldverse Services. All rights
              reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-text-muted sm:justify-end">
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
