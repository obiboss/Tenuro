import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Map,
  ShoppingBag,
  Users,
} from "lucide-react";
import { DeveloperDocumentTemplateForm } from "@/components/developer/developer-document-template-form";
import { DeveloperPayoutSetupForm } from "@/components/developer/developer-payout-setup-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { DEVELOPER_TEMPLATE_PLACEHOLDERS } from "@/constants/developer-document-templates";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { getDeveloperDocumentTemplateSettingsForCurrentDeveloper } from "@/server/services/developer-document-templates.service";
import {
  getDeveloperPayoutAccountState,
  getPaystackBanksForDeveloperSetup,
} from "@/server/services/developer-payout.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperDashboardPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type PayoutDashboardState = "missing" | "unverified" | "verified" | "failed";

type DashboardMetric = {
  estates: number;
  plots: number;
  availablePlots: number;
  reservedPlots: number;
  activeSales: number;
  buyers: number;
};

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim();

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-4)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not approved yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPayoutCopy(state: PayoutDashboardState) {
  if (state === "verified") {
    return {
      badge: "Ready",
      badgeTone: "success" as const,
      title: "Payment account ready",
      description:
        "Buyer payment links are available. Sale payments can be routed to your approved bank account.",
      actionLabel: "View bank account",
      iconTone: "bg-success-soft text-success",
    };
  }

  if (state === "unverified") {
    return {
      badge: "Under review",
      badgeTone: "warning" as const,
      title: "Bank account under review",
      description:
        "You can keep managing estates and buyers. Buyer payment links unlock after approval.",
      actionLabel: "Check bank setup",
      iconTone: "bg-warning-soft text-warning",
    };
  }

  if (state === "failed") {
    return {
      badge: "Needs correction",
      badgeTone: "danger" as const,
      title: "Bank account needs correction",
      description:
        "Update your bank details before sending buyer payment links.",
      actionLabel: "Update bank account",
      iconTone: "bg-danger-soft text-danger",
    };
  }

  return {
    badge: "Action needed",
    badgeTone: "warning" as const,
    title: "Add bank account",
    description:
      "Add the bank account where buyer payments should be settled before sending payment links.",
    actionLabel: "Add bank account",
    iconTone: "bg-primary-soft text-primary",
  };
}

async function getExactCount(
  query: PromiseLike<{
    count: number | null;
    error: unknown;
  }>,
) {
  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

async function getDashboardMetrics(params: {
  developerAccountId: string;
}): Promise<DashboardMetric> {
  const supabase = createSupabaseAdminClient();

  const [estates, plots, availablePlots, reservedPlots, activeSales, buyers] =
    await Promise.all([
      getExactCount(
        supabase
          .from("developer_estates")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId),
      ),
      getExactCount(
        supabase
          .from("developer_plots")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId),
      ),
      getExactCount(
        supabase
          .from("developer_plots")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId)
          .eq("status", "available"),
      ),
      getExactCount(
        supabase
          .from("developer_plots")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId)
          .eq("status", "reserved"),
      ),
      getExactCount(
        supabase
          .from("developer_sales")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId)
          .eq("status", "active"),
      ),
      getExactCount(
        supabase
          .from("developer_buyers")
          .select("id", { count: "exact", head: true })
          .eq("developer_account_id", params.developerAccountId),
      ),
    ]);

  return {
    estates,
    plots,
    availablePlots,
    reservedPlots,
    activeSales,
    buyers,
  };
}

function PayoutAccountSummary({
  state,
  bankName,
  accountNumber,
  accountName,
  verifiedAt,
}: {
  state: PayoutDashboardState;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  verifiedAt?: string | null;
}) {
  if (!bankName || !accountNumber || !accountName) {
    return (
      <div className="rounded-button bg-background p-5">
        <p className="text-sm font-bold leading-6 text-text-muted">
          No bank account has been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Bank
        </p>
        <p className="mt-2 font-black text-text-strong">{bankName}</p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Account number
        </p>
        <p className="mt-2 font-black text-text-strong">
          {maskAccountNumber(accountNumber)}
        </p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Account name
        </p>
        <p className="mt-2 font-black text-text-strong">{accountName}</p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Approval
        </p>
        <p className="mt-2 font-black text-text-strong">
          {state === "verified"
            ? formatDateTime(verifiedAt ?? null)
            : "Not approved yet"}
        </p>
      </div>
    </div>
  );
}

export default async function DeveloperDashboardPage({
  searchParams,
}: DeveloperDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeSection = getSingleSearchParam(resolvedSearchParams.section);

  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const payoutState = account
    ? await getDeveloperPayoutAccountState({
        supabase,
        developerAccountId: account.id,
      })
    : {
        state: "missing" as const,
        paystackAccount: null,
      };

  const shouldShowBankForm =
    payoutState.state === "missing" || payoutState.state === "failed";
  const isSettingsSection = activeSection === "settings";
  const payoutCopy = getPayoutCopy(payoutState.state);

  const [banks, documentSettings, metrics] = await Promise.all([
    shouldShowBankForm ? getPaystackBanksForDeveloperSetup() : [],
    isSettingsSection
      ? getDeveloperDocumentTemplateSettingsForCurrentDeveloper()
      : null,
    account
      ? getDashboardMetrics({ developerAccountId: account.id })
      : Promise.resolve({
          estates: 0,
          plots: 0,
          availablePlots: 0,
          reservedPlots: 0,
          activeSales: 0,
          buyers: 0,
        }),
  ]);

  if (isSettingsSection) {
    return (
      <div className="space-y-7">
        <PageHeader
          title="Settings"
          description="Manage payment setup and document settings inside your workspace."
        />

        <section
          id="payout-account"
          className="scroll-mt-24 rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-border-soft pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${payoutCopy.iconTone}`}
              >
                <CreditCard aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Payment setup
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
                  Bank account for buyer payments
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
                  Add the bank account where you want to receive buyer payments.
                  Buyer payment links stay locked until this account is
                  approved.
                </p>
              </div>
            </div>

            <Badge tone={payoutCopy.badgeTone}>{payoutCopy.badge}</Badge>
          </div>

          <div className="mt-5">
            <PayoutAccountSummary
              state={payoutState.state}
              bankName={payoutState.paystackAccount?.bank_name}
              accountNumber={payoutState.paystackAccount?.account_number}
              accountName={payoutState.paystackAccount?.account_name}
              verifiedAt={payoutState.paystackAccount?.verified_at}
            />
          </div>

          <div className="mt-5 rounded-button bg-primary-soft px-4 py-3 text-sm font-bold leading-6 text-text-strong">
            {payoutCopy.description}
          </div>
        </section>

        {shouldShowBankForm ? (
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7">
            <div className="border-b border-border-soft pb-5">
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                {payoutState.state === "failed"
                  ? "Submit corrected bank details"
                  : "Add bank account"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
                Enter the bank account where your buyer payments should be
                received. BOPA will confirm the account name before saving it
                for review.
              </p>
            </div>

            <div className="mt-6">
              <DeveloperPayoutSetupForm banks={banks} />
            </div>
          </section>
        ) : null}

        {documentSettings ? (
          <>
            <SectionCard
              title="Sale documents"
              description="These are the standard documents BOPA helps you organize for each buyer."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {documentSettings.documentDefinitions.map((document) => (
                  <div
                    key={document.type}
                    className="rounded-button border border-border-soft bg-background p-4"
                  >
                    <p className="font-black text-text-strong">
                      {document.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      {document.description}
                    </p>
                    <p className="mt-3 text-xs font-black uppercase tracking-wide text-primary">
                      {document.defaultPortalStatus}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Document auto-fill fields"
              description="BOPA can automatically fill buyer, estate, plot, sale, and payment details into your document templates."
            >
              <div className="flex flex-wrap gap-2">
                {DEVELOPER_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                  <span
                    key={placeholder}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary"
                  >
                    {placeholder}
                  </span>
                ))}
              </div>
            </SectionCard>

            <div className="space-y-5">
              {documentSettings.editableTemplates.map((template) => (
                <DeveloperDocumentTemplateForm
                  key={template.templateType}
                  template={template}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Overview"
        description="Track your estates, plots, buyers, and active sales from one real estate workspace."
      />

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 sm:p-7">
            <p className="text-sm font-black uppercase tracking-wide text-primary">
              Estate sales workspace
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-strong sm:text-3xl">
              {account?.company_name ?? "Your real estate portfolio"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
              Manage estates, organize plot inventory, track buyer activity, and
              keep every sale record connected.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/developer/estates"
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
              >
                Manage estates
              </Link>

              <Link
                href="/developer/sales"
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft hover:text-primary"
              >
                View sales
              </Link>
            </div>
          </div>

          <div className="border-t border-border-soft bg-primary-soft p-5 sm:p-7 lg:border-l lg:border-t-0">
            <p className="text-sm font-black text-text-strong">
              Portfolio readiness
            </p>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: `${metrics.estates} estate${metrics.estates === 1 ? "" : "s"} created`,
                  ready: metrics.estates > 0,
                },
                {
                  label: `${metrics.plots} plot${metrics.plots === 1 ? "" : "s"} recorded`,
                  ready: metrics.plots > 0,
                },
                {
                  label:
                    payoutState.state === "verified"
                      ? "Buyer payment links ready"
                      : "Bank approval needed for buyer payment links",
                  ready: payoutState.state === "verified",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div
                    className={
                      item.ready
                        ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white"
                        : "flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-warning"
                    }
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      size={17}
                      strokeWidth={2.8}
                    />
                  </div>

                  <p className="pt-1 text-sm font-bold leading-6 text-text-strong">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Estates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.estates}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Estate projects in your workspace.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total plots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.plots}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Plots created across all estates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available plots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.availablePlots}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Plots still open for buyers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.activeSales}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-muted">
              Buyer sales currently in progress.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Sales activity"
          description="A quick view of where buyer activity stands across your portfolio."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Reserved plots",
                value: metrics.reservedPlots,
                icon: Map,
              },
              {
                label: "Buyers",
                value: metrics.buyers,
                icon: Users,
              },
              {
                label: "Active sales",
                value: metrics.activeSales,
                icon: ShoppingBag,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-card border border-border-soft bg-background p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
                    <Icon aria-hidden="true" size={21} strokeWidth={2.6} />
                  </div>

                  <p className="mt-4 text-2xl font-black text-text-strong">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <section className="rounded-card border border-border-soft bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${payoutCopy.iconTone}`}
              >
                <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
              </div>

              <div>
                <h2 className="font-black text-text-strong">
                  {payoutCopy.title}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                  {payoutCopy.description}
                </p>
              </div>
            </div>

            <Badge tone={payoutCopy.badgeTone}>{payoutCopy.badge}</Badge>
          </div>

          <Link
            href="/developer?section=settings#payout-account"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
          >
            {payoutCopy.actionLabel}
          </Link>
        </section>
      </div>

      <SectionCard
        title="Quick actions"
        description="Jump into the main areas of your real estate sales workflow."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Estates",
              description: "Create estates and organize plot inventory.",
              href: "/developer/estates",
              icon: Building2,
            },
            {
              title: "Buyers",
              description: "Review buyers connected to your sales.",
              href: "/developer/buyers",
              icon: Users,
            },
            {
              title: "Bank account",
              description: "Add or review your payment account.",
              href: "/developer?section=settings#payout-account",
              icon: CreditCard,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-card border border-border-soft bg-background p-4 transition hover:border-primary/40 hover:bg-primary-soft"
              >
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
                  <Icon aria-hidden="true" size={21} strokeWidth={2.6} />
                </div>

                <p className="mt-4 font-black text-text-strong">{item.title}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
