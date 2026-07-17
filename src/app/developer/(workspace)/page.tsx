import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPin,
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
  activeSales: number;
};

type DashboardAttentionItem = {
  id: string;
  kind: "payment" | "reservation" | "estate";
  title: string;
  description: string;
  href: string;
};

type DashboardData = {
  metrics: DashboardMetric;
  attentionItems: DashboardAttentionItem[];
};

type DashboardEstateRow = {
  id: string;
  estate_name: string;
  status: string;
};

type DashboardPurchaseLinkRow = {
  id: string;
  estate_id: string;
  plot_id: string;
  status: string;
  expires_at: string | null;
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

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return count === 1 ? singular : plural;
}

function formatEstateNames(
  estateIds: string[],
  estateNameById: Map<string, string>,
) {
  const names = Array.from(
    new Set(
      estateIds
        .map((estateId) => estateNameById.get(estateId))
        .filter((name): name is string => Boolean(name)),
    ),
  );

  if (names.length === 0) {
    return "Across your estates";
  }

  if (names.length === 1) {
    return `At ${names[0]}`;
  }

  if (names.length === 2) {
    return `Across ${names[0]} and ${names[1]}`;
  }

  return `Across ${names[0]}, ${names[1]}, and other estates`;
}

function getReservationExpiryCopy(
  purchaseLinks: DashboardPurchaseLinkRow[],
) {
  const futureExpiryTimes = purchaseLinks
    .map((link) =>
      link.expires_at
        ? new Date(link.expires_at).getTime()
        : Number.NaN,
    )
    .filter(
      (value) =>
        Number.isFinite(value) && value > Date.now(),
    )
    .sort((first, second) => first - second);

  const nextExpiry = futureExpiryTimes[0];

  if (!nextExpiry) {
    return "Review the plots awaiting buyer confirmation.";
  }

  const hoursRemaining = Math.max(
    1,
    Math.ceil(
      (nextExpiry - Date.now()) / (60 * 60 * 1000),
    ),
  );

  if (hoursRemaining <= 48) {
    return `The next reservation expires in ${hoursRemaining} ${pluralize(
      hoursRemaining,
      "hour",
    )}.`;
  }

  const daysRemaining = Math.ceil(hoursRemaining / 24);

  return `The next reservation expires in ${daysRemaining} ${pluralize(
    daysRemaining,
    "day",
  )}.`;
}

async function getDashboardData(params: {
  developerAccountId: string;
}): Promise<DashboardData> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const [
    estates,
    plots,
    availablePlots,
    reservedPlots,
    activeSales,
    estatesResult,
    pendingPaymentResult,
    activeReservationResult,
  ] = await Promise.all([
    getExactCount(
      supabase
        .from("developer_estates")
        .select("id", { count: "exact", head: true })
        .eq(
          "developer_account_id",
          params.developerAccountId,
        ),
    ),
    getExactCount(
      supabase
        .from("developer_plots")
        .select("id", { count: "exact", head: true })
        .eq(
          "developer_account_id",
          params.developerAccountId,
        ),
    ),
    getExactCount(
      supabase
        .from("developer_plots")
        .select("id", { count: "exact", head: true })
        .eq(
          "developer_account_id",
          params.developerAccountId,
        )
        .eq("status", "available"),
    ),
    getExactCount(
      supabase
        .from("developer_plots")
        .select("id", { count: "exact", head: true })
        .eq(
          "developer_account_id",
          params.developerAccountId,
        )
        .eq("status", "reserved"),
    ),
    getExactCount(
      supabase
        .from("developer_sales")
        .select("id", { count: "exact", head: true })
        .eq(
          "developer_account_id",
          params.developerAccountId,
        )
        .eq("status", "active"),
    ),
    supabase
      .from("developer_estates")
      .select("id, estate_name, status")
      .eq(
        "developer_account_id",
        params.developerAccountId,
      )
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<DashboardEstateRow[]>(),
    supabase
      .from("developer_buyer_purchase_links")
      .select("id, estate_id, plot_id, status, expires_at", {
        count: "exact",
      })
      .eq(
        "developer_account_id",
        params.developerAccountId,
      )
      .eq("status", "payment_started")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<DashboardPurchaseLinkRow[]>(),
    supabase
      .from("developer_buyer_purchase_links")
      .select("id, estate_id, plot_id, status, expires_at")
      .eq(
        "developer_account_id",
        params.developerAccountId,
      )
      .in("status", [
        "pending",
        "details_submitted",
        "payment_started",
      ])
      .gt("expires_at", now)
      .order("expires_at", { ascending: true })
      .limit(200)
      .returns<DashboardPurchaseLinkRow[]>(),
  ]);

  if (estatesResult.error) {
    throw estatesResult.error;
  }

  if (pendingPaymentResult.error) {
    throw pendingPaymentResult.error;
  }

  if (activeReservationResult.error) {
    throw activeReservationResult.error;
  }

  const estateRows = estatesResult.data ?? [];
  const pendingPaymentLinks =
    pendingPaymentResult.data ?? [];
  const activeReservationLinks =
    activeReservationResult.data ?? [];
  const pendingPaymentCount =
    pendingPaymentResult.count ??
    pendingPaymentLinks.length;

  const estateNameById = new Map(
    estateRows.map((estate) => [
      estate.id,
      estate.estate_name,
    ]),
  );

  const attentionItems: DashboardAttentionItem[] = [];

  if (estates === 0) {
    attentionItems.push({
      id: "create-first-estate",
      kind: "estate",
      title: "Create your first estate",
      description:
        "Add the estate details and generate its plot inventory.",
      href: "/developer/estates/new",
    });
  }

  if (pendingPaymentCount > 0) {
    attentionItems.push({
      id: "pending-first-payments",
      kind: "payment",
      title: `${pendingPaymentCount} ${pluralize(
        pendingPaymentCount,
        "buyer",
      )} ${pluralize(
        pendingPaymentCount,
        "has",
        "have",
      )} a pending first payment`,
      description: formatEstateNames(
        pendingPaymentLinks.map(
          (link) => link.estate_id,
        ),
        estateNameById,
      ),
      href: "/developer/sales",
    });
  }

  if (reservedPlots > 0) {
    attentionItems.push({
      id: "reserved-plots",
      kind: "reservation",
      title: `${reservedPlots} ${pluralize(
        reservedPlots,
        "plot",
      )} reserved, awaiting confirmation`,
      description: getReservationExpiryCopy(
        activeReservationLinks,
      ),
      href: "/developer/estates",
    });
  }

  const planningEstateCandidates = estateRows
    .filter((estate) => estate.status === "planning")
    .slice(0, 12);

  const planningEstatePlotCounts = await Promise.all(
    planningEstateCandidates.map(async (estate) => ({
      estate,
      plotCount: await getExactCount(
        supabase
          .from("developer_plots")
          .select("id", { count: "exact", head: true })
          .eq(
            "developer_account_id",
            params.developerAccountId,
          )
          .eq("estate_id", estate.id),
      ),
    })),
  );

  const planningEstatesWithoutPlots =
    planningEstatePlotCounts
      .filter((item) => item.plotCount === 0)
      .map((item) => item.estate)
      .slice(0, 3);

  for (const estate of planningEstatesWithoutPlots) {
    attentionItems.push({
      id: `planning-estate-${estate.id}`,
      kind: "estate",
      title: `${estate.estate_name} is still in planning`,
      description: "No plots have been generated yet.",
      href: `/developer/estates/${estate.id}`,
    });
  }

  return {
    metrics: {
      estates,
      plots,
      availablePlots,
      activeSales,
    },
    attentionItems,
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

  const [banks, documentSettings, dashboardData] = await Promise.all([
    shouldShowBankForm ? getPaystackBanksForDeveloperSetup() : [],
    isSettingsSection
      ? getDeveloperDocumentTemplateSettingsForCurrentDeveloper()
      : null,
    account
      ? getDashboardData({ developerAccountId: account.id })
      : Promise.resolve({
          metrics: {
            estates: 0,
            plots: 0,
            availablePlots: 0,
            activeSales: 0,
          },
          attentionItems: [
            {
              id: "create-first-estate",
              kind: "estate" as const,
              title: "Create your first estate",
              description:
                "Add the estate details and generate its plot inventory.",
              href: "/developer/estates/new",
            },
          ],
        }),
  ]);

  const { metrics, attentionItems } = dashboardData;

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

  const attentionIconByKind = {
    payment: CreditCard,
    reservation: Clock3,
    estate: Building2,
  } as const;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Overview"
        description="Track your estates, plots, buyers, and active sales from one real estate workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="mb-2">
            <CardTitle>Estates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.estates}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="mb-2">
            <CardTitle>Total plots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-text-strong">
              {metrics.plots}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="mb-2">
            <CardTitle>Available plots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-success">
              {metrics.availablePlots}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="mb-2">
            <CardTitle>Active sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-primary">
              {metrics.activeSales}
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="border-b border-border-soft p-5 sm:p-6">
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Needs your attention
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Items across your portfolio that are waiting on you.
          </p>
        </div>

        {attentionItems.length > 0 ? (
          <div className="divide-y divide-border-soft">
            {attentionItems.map((item) => {
              const Icon = attentionIconByKind[item.kind];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-center gap-4 px-5 py-4 transition hover:bg-primary-soft/50 sm:px-6"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon
                      aria-hidden="true"
                      size={21}
                      strokeWidth={2.6}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black text-text-strong">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-text-muted">
                      {item.description}
                    </p>
                  </div>

                  <ChevronRight
                    aria-hidden="true"
                    size={20}
                    strokeWidth={2.6}
                    className="shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-4 p-5 sm:p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
              <MapPin
                aria-hidden="true"
                size={21}
                strokeWidth={2.6}
              />
            </div>

            <div>
              <p className="font-black text-text-strong">
                Nothing needs your attention right now
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                New buyer, reservation, and estate tasks will appear here.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-border-soft bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${payoutCopy.iconTone}`}
          >
            <CreditCard
              aria-hidden="true"
              size={22}
              strokeWidth={2.6}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black text-text-strong">
                {payoutCopy.title}
              </h2>
              <Badge tone={payoutCopy.badgeTone}>
                {payoutCopy.badge}
              </Badge>
            </div>

            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-text-muted">
              {payoutCopy.description}
            </p>
          </div>
        </div>

        <Link
          href="/developer?section=settings#payout-account"
          className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-button border border-border-soft bg-white px-5 py-2.5 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary sm:self-auto"
        >
          {payoutCopy.actionLabel}
        </Link>
      </section>
    </div>
  );
}
