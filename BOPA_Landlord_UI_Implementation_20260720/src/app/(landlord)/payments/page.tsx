import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualPaymentForm } from "@/components/payment/manual-payment-form";
import { PaymentList } from "@/components/payment/payment-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
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
            : "Record payments and send receipts."
        }
        action={
          isThisYearFilter ? (
            <Badge tone="primary">This Year</Badge>
          ) : (
            <Link href="/payments/claims">
              <Button variant="secondary">Payments to confirm</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="order-2 xl:order-1">
          <SectionCard
            title={
              isThisYearFilter ? "This Year’s Payments" : "Payment History"
            }
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
        </div>

        <div className="order-1 xl:order-2 xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Record a payment made outside BOPA"
            description="Use this when you have already confirmed the payment yourself."
            contentClassName="p-4 md:p-5"
            className="[&>div:first-child]:px-4 [&>div:first-child]:py-3 [&>div:first-child]:md:px-5"
          >
            <ManualPaymentForm tenancies={activeTenancies} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
