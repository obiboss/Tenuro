import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  //Landmark,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import { Manager3DShowcase } from "@/components/manager/manager-3d-showcase";
import { BusinessSubscriptionPricing } from "@/components/subscription/business-subscription-pricing";
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
  "Landlord records spread across different files",
  "Rent payments not tied clearly to tenants",
  "Manual commission and remittance calculations",
  "Difficulty knowing what each landlord is owed",
  "Maintenance requests handled informally",
  "Staff access with little accountability",
];

const modules = [
  {
    title: "Landlord Client Records",
    description:
      "Keep each landlord, property, payout detail, and management instruction in one organised workspace.",
    icon: Building2,
  },
  {
    title: "Properties, Units & Tenants",
    description:
      "Track managed properties, units, tenant records, rent amount, balance, due dates, and occupancy status.",
    icon: Users,
  },
  {
    title: "Rent Collection Tracking",
    description:
      "Record manual rent payments or send verified online payment links with clear payment history.",
    icon: CreditCard,
  },
  {
    title: "Commission & Landlord Share",
    description:
      "BOPA calculates management fee, landlord net amount, and remittance balance from the rent records.",
    icon: WalletCards,
  },
  {
    title: "Receipts & Statements",
    description:
      "Generate rent receipts, landlord statements, and remittance summaries with your manager company name.",
    icon: ReceiptText,
  },
  {
    title: "Maintenance Tracking",
    description:
      "Track reported repairs, estimated cost, actual cost, vendor details, and resolution status.",
    icon: Wrench,
  },
  {
    title: "Staff Roles",
    description:
      "Give managers, accountants, property officers, and maintenance officers controlled access.",
    icon: ShieldCheck,
  },
  {
    title: "Reports & Accountability",
    description:
      "Review payment records, landlord balances, staff actions, and operational activity more clearly.",
    icon: ClipboardList,
  },
];

const workflow = [
  "Create manager company",
  "Add landlord clients",
  "Add properties and units",
  "Add tenants and rent balances",
  "Track rent collection",
  "Send receipts and reports",
];

const outcomes = [
  {
    title: "Clear landlord balances",
    description:
      "Know what was collected, what your company earned, and what each landlord should receive.",
  },
  {
    title: "Cleaner tenant records",
    description:
      "Keep tenant details, rent amount, payment status, and due dates in one organised place.",
  },
  {
    title: "Better staff control",
    description:
      "Give each staff member the right access without exposing sensitive settings.",
  },
  {
    title: "More professional reporting",
    description:
      "Send receipts, statements, and remittance summaries that look clean and trustworthy.",
  },
];

export default function ManagersLandingPage() {
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
                Property Manager Workspace
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center">
            <LandingHeaderLogin />
          </div>
        </header>

        <div className="py-12 lg:py-16">
          <Manager3DShowcase />
        </div>

        <section className="rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">For structured property managers</Badge>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong md:text-5xl">
              Manage landlords, tenants, rent collection, and remittances in one
              clean workspace.
            </h1>

            <p className="mt-5 text-base leading-8 text-text-muted md:text-lg">
              BOPA Manager helps property management firms organise landlord
              clients, properties, tenants, rent payments, receipts,
              maintenance, staff access, and landlord reporting without relying
              on scattered spreadsheets and WhatsApp messages.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/manager/register">
                <Button type="button" fullWidth>
                  Create Manager Account
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/contact?workspace=manager">
                <Button type="button" variant="secondary" fullWidth>
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <BusinessSubscriptionPricing signupHref="/manager/register" />

        <section className="mt-8 rounded-4xl bg-surface px-5 py-8 shadow-card md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <Badge tone="primary">Operational problems</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              The problems BOPA Manager helps reduce.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              Structured property managers deal with many landlords, tenants,
              properties, payments, repairs, and reports. BOPA makes the records
              clearer and easier to control.
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
            <Badge tone="primary">Manager modules</Badge>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-strong md:text-3xl">
              What BOPA does for your property management company.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA Manager gives your team a cleaner way to manage landlords,
              tenants, rent payments, maintenance, receipts, statements, and
              staff roles.
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
              From landlord onboarding to remittance reporting.
            </h2>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              BOPA follows the real property management workflow from landlord
              records to tenants, payments, receipts, maintenance, and reports.
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
                Ready to manage properties with cleaner records?
              </h2>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-white/80">
                Create a BOPA Manager account and start organising landlord
                clients, rent payments, remittances, receipts, maintenance, and
                staff roles from one workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/manager/register">
                <Button type="button" variant="secondary" fullWidth>
                  Create Manager Account
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/contact?workspace=manager">
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
                href="/developers"
                className="transition-colors hover:text-text-strong"
              >
                Developers
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

