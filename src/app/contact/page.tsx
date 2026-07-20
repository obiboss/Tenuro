import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageCircleQuestion,
} from "lucide-react";
import { DemoRequestForm } from "@/components/public/demo-request-form";
import { Badge } from "@/components/ui/badge";
import type { DemoWorkspaceType } from "@/server/validators/demo-request.schema";

export const metadata: Metadata = {
  title: "Book a Live Demo",
  description:
    "Request a live demonstration of BOPA Manager or BOPA Developer for your property business.",
  alternates: {
    canonical: "https://boldverseproperty.com/contact",
  },
};

type ContactPageProps = {
  searchParams: Promise<{
    workspace?: string;
  }>;
};

function parseWorkspace(value: string | undefined): DemoWorkspaceType {
  return value === "developer" ? "developer" : "manager";
}

function getLagosDateString() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

const demoExpectations = [
  {
    title: "A focused walkthrough",
    description:
      "We will show the parts of BOPA that match the work your company handles.",
    icon: CalendarCheck2,
  },
  {
    title: "A suitable time",
    description:
      "Choose the date and time period you prefer. We will contact you to confirm it.",
    icon: Clock3,
  },
  {
    title: "Your questions answered",
    description:
      "Bring questions about your properties, estates, records, staff, or payment process.",
    icon: MessageCircleQuestion,
  },
] as const;

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const resolvedSearchParams = await searchParams;
  const defaultWorkspace = parseWorkspace(resolvedSearchParams.workspace);
  const returnHref =
    defaultWorkspace === "manager" ? "/managers" : "/developers";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border-soft bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 md:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
              B
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-text-strong">
                Boldverse Property
              </p>
              <p className="truncate text-xs font-semibold text-text-muted">
                BOPA live demonstration
              </p>
            </div>
          </Link>

          <Link
            href={returnHref}
            className="flex shrink-0 items-center gap-2 text-sm font-bold text-text-muted transition-colors hover:text-text-strong"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.6} />
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <Badge tone="primary">Live BOPA demonstration</Badge>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-text-strong md:text-5xl">
              See how BOPA fits the way your company works.
            </h1>

            <p className="mt-5 text-base font-semibold leading-8 text-text-muted md:text-lg">
              Request a live demonstration of BOPA Manager or BOPA Developer. We
              will focus on the records, payments, people, and daily work that
              matter to your business.
            </p>

            <div className="mt-8 space-y-4">
              {demoExpectations.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-card border border-border-soft bg-white p-5 shadow-soft"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" size={21} strokeWidth={2.6} />
                    </div>

                    <div>
                      <h2 className="font-black text-text-strong">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-card bg-success-soft p-5 text-success">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 shrink-0"
                size={21}
                strokeWidth={2.6}
              />
              <p className="text-sm font-bold leading-6">
                There is no payment required to request or attend a demo.
              </p>
            </div>
          </div>

          <section className="rounded-4xl border border-border-soft bg-white p-5 shadow-card md:p-8">
            <div className="mb-7">
              <p className="text-sm font-black uppercase tracking-wide text-primary">
                Request your demo
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
                Tell us when and how to reach you.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                Complete the short form below. Your preferred time will be
                confirmed by the BOPA team.
              </p>
            </div>

            <DemoRequestForm
              defaultWorkspace={defaultWorkspace}
              minimumDate={getLagosDateString()}
            />
          </section>
        </div>
      </section>

      <footer className="border-t border-border-soft bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 text-sm text-text-muted md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Boldverse Services.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-text-strong">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-text-strong">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
