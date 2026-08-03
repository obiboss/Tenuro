import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualPaymentForm } from "@/components/payment/manual-payment-form";
import { PaymentList } from "@/components/payment/payment-list";
import { PendingPaymentClaimsPanel } from "@/components/payment/pending-payment-claims-panel";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
import { getCurrentLandlordPendingPaymentClaims } from "@/server/services/caretaker-payment-claims.service";
import {
  getCurrentLandlordRentPayments,
  getThisYearPaymentFilter,
} from "@/server/services/payments.service";
import { getCurrentLandlordTenancies } from "@/server/services/tenancies.service";

type PaymentTab = "confirm" | "record" | "history";

type PaymentsPageProps = {
  searchParams: Promise<{
    filter?: string;
    tab?: string;
  }>;
};

function buildTenancyLabel(
  tenancy: Awaited<ReturnType<typeof getCurrentLandlordTenancies>>[number],
) {
  const tenantName = tenancy.tenants?.full_name ?? "Tenant";
  const propertyName = tenancy.units?.properties?.property_name ?? "Property";
  const buildingName = tenancy.units?.building_name
    ? `${tenancy.units.building_name} - `
    : "";
  const unitName = tenancy.units?.unit_identifier ?? "Unit";

  return `${tenantName} - ${propertyName} - ${buildingName}${unitName}`;
}

function resolvePaymentTab(value: string | undefined): PaymentTab {
  if (value === "record" || value === "history") {
    return value;
  }

  return "confirm";
}

function buildTabHref(tab: PaymentTab, filter?: string) {
  const params = new URLSearchParams({ tab });

  if (filter) {
    params.set("filter", filter);
  }

  return `/payments?${params.toString()}`;
}

function PaymentTabs({
  activeTab,
  confirmationCount,
  filter,
}: {
  activeTab: PaymentTab;
  confirmationCount: number;
  filter?: string;
}) {
  const tabs: { id: PaymentTab; label: string }[] = [
    { id: "confirm", label: "To confirm" },
    { id: "record", label: "Record / link" },
    { id: "history", label: "History" },
  ];

  return (
    <nav
      aria-label="Payment sections"
      className="flex gap-2 overflow-x-auto border-b border-border-soft pb-3"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            key={tab.id}
            href={buildTabHref(tab.id, filter)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-button px-4 text-sm font-bold transition",
              active
                ? "bg-primary text-white shadow-soft"
                : "bg-surface text-text-strong ring-1 ring-border-soft hover:bg-primary-soft",
            )}
          >
            {tab.label}
            {tab.id === "confirm" && confirmationCount > 0 ? (
              <Badge tone={active ? "neutral" : "warning"}>
                {confirmationCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const isThisYearFilter = resolvedSearchParams.filter === "this_year";
  const activeTab = isThisYearFilter
    ? "history"
    : resolvePaymentTab(resolvedSearchParams.tab);

  const [payments, tenancies, paymentClaims] = await Promise.all([
    getCurrentLandlordRentPayments(
      isThisYearFilter ? getThisYearPaymentFilter() : {},
    ),
    getCurrentLandlordTenancies(),
    getCurrentLandlordPendingPaymentClaims(),
  ]);

  const activeTenancies = tenancies
    .filter((tenancy) => tenancy.status === "active")
    .map((tenancy) => ({
      label: buildTenancyLabel(tenancy),
      value: tenancy.id,
      rentAmount: tenancy.rent_amount,
    }));

  return (
    <div className="space-y-4">
      {isThisYearFilter ? (
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to overview
        </Link>
      ) : null}

      <PageHeader
        compact
        title="Payments"
        description={
          isThisYearFilter
            ? "Rent recorded this year."
            : "Confirm payments, send links, and view your records."
        }
        action={
          isThisYearFilter ? <Badge tone="primary">This Year</Badge> : null
        }
      />

      <PaymentTabs
        activeTab={activeTab}
        confirmationCount={paymentClaims.length}
        filter={isThisYearFilter ? "this_year" : undefined}
      />

      {activeTab === "confirm" ? (
        <SectionCard
          title="Payments to confirm"
          description="Check payment claims before recording them."
          contentClassName="p-4 md:p-5"
          className="[&>div:first-child]:px-4 [&>div:first-child]:py-3 [&>div:first-child]:md:px-5"
        >
          <PendingPaymentClaimsPanel claims={paymentClaims} />
        </SectionCard>
      ) : null}

      {activeTab === "record" ? (
        <SectionCard
          title="Record a payment made outside BOPA"
          description="Send a link or record a payment already received."
          contentClassName="p-4 md:p-5"
          className="[&>div:first-child]:px-4 [&>div:first-child]:py-3 [&>div:first-child]:md:px-5"
        >
          <ManualPaymentForm tenancies={activeTenancies} />
        </SectionCard>
      ) : null}

      {activeTab === "history" ? (
        <SectionCard
          title={isThisYearFilter ? "This year's payments" : "Payment History"}
          contentClassName="p-4 md:p-5"
          className="[&>div:first-child]:px-4 [&>div:first-child]:py-3 [&>div:first-child]:md:px-5"
        >
          <PaymentList
            payments={payments}
            emptyTitle={
              isThisYearFilter
                ? "No rent collected this year"
                : "No payments recorded yet"
            }
            emptyDescription={
              isThisYearFilter
                ? "Payments you record this year will appear here."
                : "Recorded payments appear here with receipt status."
            }
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
