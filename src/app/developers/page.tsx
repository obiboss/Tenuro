import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  Landmark,
  LayoutGrid,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Developer3DShowcase } from "@/components/developer/developer-3d-showcase";
import { LandingHeaderLogin } from "@/components/landing/landing-header-login";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const painPoints = [
  "Scattered buyer records",
  "Missed installment follow-ups",
  "Unclear plot status",
  "Manual receipt errors",
  "Weak staff accountability",
  "Unknown document status",
];

const modules = [
  {
    title: "Estate & Plot Management",
    description:
      "Create estates, generate plots, group plots by size or category, and track available, reserved, allocated, and sold plots.",
    icon: LayoutGrid,
  },
  {
    title: "Buyer & Allocation Records",
    description:
      "Keep buyer details, selected plot, payment plan, allocation status, and purchase history in one place.",
    icon: Users,
  },
  {
    title: "Payment & Installment Tracking",
    description:
      "Track full payments, initial deposits, flexible installments, balances, and due payment records.",
    icon: CreditCard,
  },
  {
    title: "Payment Requests & Receipts",
    description:
      "Send buyer payment requests and generate clean receipts after verified payments.",
    icon: ReceiptText,
  },
  {
    title: "Staff & Sales Team Control",
    description:
      "Give team members controlled access so sales, accounts, and documentation work stays organised.",
    icon: ShieldCheck,
  },
  {
    title: "Document Copy Tracking",
    description:
      "Track allocation letters, sales agreements, survey documents, deed copies, and other buyer records.",
    icon: FileText,
  },
  {
    title: "Buyer Portal",
    description:
      "Give buyers a secure portal to view their plot, payment history, balance, and receipts.",
    icon: Landmark,
  },
  {
    title: "Audit Trail & Accountability",
    description:
      "Keep a clean record of key actions, payment confirmations, document activity, and staff updates.",
    icon: ClipboardList,
  },
];

const workflow = [
  "Create estate and plots",
  "Allocate buyer interest",
  "Capture buyer information",
  "Track verified payments",
  "Generate receipts",
  "Share buyer portal",
];

const outcomes = [
  {
    title: "Less risk",
    description:
      "Reduce lost records, unclear payment history, and informal buyer follow-up.",
  },
  {
    title: "More trust",
    description:
      "Buyers get cleaner records, receipts, and access to their purchase details.",
  },
  {
    title: "Accountability",
    description:
      "Staff actions, payment handling, and document updates become easier to trace.",
  },
  {
    title: "Faster reports",
    description:
      "Leadership can see estate sales, balances, and buyer status without chasing spreadsheets.",
  },
];

export default function DevelopersLandingPage() {
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
                Developer Estate Sales Workspace
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center">
            <LandingHeaderLogin />
          </div>
        </header>

        <div className="py-12 lg:py-16">
          <Developer3DShowcase />
        </div>

        <section className="rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">Operational problems</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              The problems BOPA helps eliminate.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              Real estate developers often run estate sales through WhatsApp,
              spreadsheets, screenshots, and manual office records. BOPA brings
              the important work into one structured system.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {painPoints.map((point) => (
              <div
                key={point}
                className="rounded-card border border-border-soft bg-background p-5"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <BadgeCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                </div>

                <p className="font-black text-text-strong">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <Badge tone="primary">Developer modules</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              What BOPA does for your firm.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA Developer gives your estate sales team a cleaner way to
              manage buyers, plots, payments, receipts, documents, and buyer
              communication.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Card key={module.title}>
                  <CardHeader>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" size={24} strokeWidth={2.6} />
                    </div>

                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">Workflow</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              From buyer interest to clean records.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA follows the real estate sales journey from estate setup to
              buyer records, payments, receipts, and post-sale buyer access.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-card border border-border-soft bg-background p-5"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white">
                  {index + 1}
                </div>

                <p className="text-sm font-black leading-6 text-text-strong">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {outcomes.map((outcome) => (
            <div
              key={outcome.title}
              className="rounded-card border border-border-soft bg-white p-5 shadow-soft"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
                <FileCheck2 aria-hidden="true" size={22} strokeWidth={2.6} />
              </div>

              <h3 className="text-lg font-black text-text-strong">
                {outcome.title}
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {outcome.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-4xl bg-primary px-5 py-10 text-white shadow-card md:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                Ready to see BOPA Developer in action?
              </h2>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-white/80">
                Book a live demo and see how BOPA can reduce operational
                confusion, strengthen buyer trust, and give your team better
                control over every estate sale.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/developer/register">
                <Button type="button" variant="secondary" fullWidth>
                  Create Developer Account
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/contact">
                <Button type="button" variant="secondary" fullWidth>
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-border-soft pt-8 pb-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Boldverse Services. All rights
              reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-text-muted sm:justify-end">
              <Link
                href="/"
                className="transition-colors hover:text-text-strong"
              >
                Home
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
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
