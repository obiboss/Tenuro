import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileCheck2,
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
    title: "Generate receipts",
    description:
      "Create professional receipts tenants can receive by WhatsApp after payment is confirmed.",
    icon: FileCheck2,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-7xl flex-col px-4 py-8 md:px-8 lg:py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-text-strong">
                Tenuro
              </p>
              <p className="text-xs font-semibold text-text-muted">
                Property records made simple
              </p>
            </div>
          </Link>

          <Link href="/overview">
            <Button>Open App</Button>
          </Link>
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
              Tenuro helps landlords keep proper rental records, track who has
              paid, know who is owing, and send clear receipts without relying
              on notebooks or scattered WhatsApp messages.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/overview">
                <Button size="lg" fullWidth>
                  Open App
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
                </Button>
              </Link>

              <Link href="/properties">
                <Button size="lg" variant="secondary" fullWidth>
                  View Properties
                </Button>
              </Link>
            </div>

            <div className="mt-8">
              <TrustNotice
                title="Designed for proper landlord records"
                description="Every payment, correction, tenant profile, and receipt is kept in a clear history you can trust."
                icon={
                  <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface p-5 shadow-card md:p-6">
            <div className="rounded-[1.5rem] bg-background p-5">
              <div className="grid gap-4">
                <StatCard
                  title="Total Units"
                  value="—"
                  description="Across your properties"
                  icon={<Building2 size={22} strokeWidth={2.6} />}
                />

                <StatCard
                  title="Tenants"
                  value="—"
                  description="Active rental records"
                  tone="success"
                  icon={<Users size={22} strokeWidth={2.6} />}
                />

                <StatCard
                  title="Rent Collected"
                  value="—"
                  description="Track payments monthly"
                  tone="gold"
                  icon={<ReceiptText size={22} strokeWidth={2.6} />}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
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
      </section>
    </main>
  );
}
