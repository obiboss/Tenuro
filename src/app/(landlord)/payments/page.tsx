import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualPaymentForm } from "@/components/payment/manual-payment-form";
import { PaymentList } from "@/components/payment/payment-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  getCurrentLandlordRentPayments,
  getThisYearPaymentFilter,
} from "@/server/services/payments.service";
import { getCurrentLandlordTenancies } from "@/server/services/tenancies.service";

type PaymentsPageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

function buildTenancyLabel(
  tenancy: Awaited<ReturnType<typeof getCurrentLandlordTenancies>>[number],
) {
  const tenantName = tenancy.tenants?.full_name ?? "Tenant";
  const propertyName = tenancy.units?.properties?.property_name ?? "Property";
  const buildingName = tenancy.units?.building_name
    ? `${tenancy.units.building_name} · `
    : "";
  const unitName = tenancy.units?.unit_identifier ?? "Unit";

  return `${tenantName} — ${propertyName} · ${buildingName}${unitName}`;
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const isThisYearFilter = resolvedSearchParams.filter === "this_year";

  const [payments, tenancies] = await Promise.all([
    getCurrentLandlordRentPayments(
      isThisYearFilter ? getThisYearPaymentFilter() : {},
    ),
    getCurrentLandlordTenancies(),
  ]);

  const activeTenancies = tenancies
    .filter((tenancy) => tenancy.status === "active")
    .map((tenancy) => ({
      label: buildTenancyLabel(tenancy),
      value: tenancy.id,
      rentAmount: tenancy.rent_amount,
    }));

  return (
    <div>
      {isThisYearFilter ? (
        <Link
          href="/overview"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.6} />
          Back to overview
        </Link>
      ) : null}

      <PageHeader
        title="Payments"
        description={
          isThisYearFilter
            ? "Showing rent payments recorded this year."
            : "Record rent payments, view tenant payment history, and keep your ledger accurate."
        }
        action={
          isThisYearFilter ? <Badge tone="primary">This Year</Badge> : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title={isThisYearFilter ? "This Year’s Payments" : "Payment History"}
          description={
            isThisYearFilter
              ? "These are the payments included in Rent Collected on your overview."
              : "All posted manual and gateway payments appear here."
          }
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
                : "When you record rent payments, they will appear here with receipt status."
            }
          />
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Record Manual Payment"
            description="Use this for bank transfers, cash, and offline rent payments."
          >
            <ManualPaymentForm tenancies={activeTenancies} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
