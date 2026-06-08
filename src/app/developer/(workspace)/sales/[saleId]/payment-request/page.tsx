import Link from "next/link";
import { notFound } from "next/navigation";
import { DeveloperPaymentRequestForm } from "@/components/developer/developer-payment-request-form";
import { PageHeader } from "@/components/ui/page-header";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import {
  getActiveDeveloperPaymentPlanForSale,
  listDeveloperPaymentScheduleItemsForSale,
} from "@/server/repositories/developer-payment-plans.repository";
import { listDeveloperSaleLedgerEntriesForSale } from "@/server/repositories/developer-sale-ledger.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperSalePaymentRequestPageProps = {
  params: Promise<{
    saleId: string;
  }>;
};

export default async function DeveloperSalePaymentRequestPage({
  params,
}: DeveloperSalePaymentRequestPageProps) {
  const { saleId } = await params;
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account) {
    notFound();
  }

  const sale = await getDeveloperSaleById(supabase, {
    developerAccountId: account.id,
    saleId,
  });

  if (!sale || sale.status !== "active") {
    notFound();
  }

  const [paymentPlan, scheduleItems, ledgerEntries] = await Promise.all([
    getActiveDeveloperPaymentPlanForSale(supabase, {
      developerAccountId: account.id,
      saleId,
    }),
    listDeveloperPaymentScheduleItemsForSale(supabase, {
      developerAccountId: account.id,
      saleId,
    }),
    listDeveloperSaleLedgerEntriesForSale(supabase, {
      developerAccountId: account.id,
      saleId,
    }),
  ]);

  if (!paymentPlan) {
    notFound();
  }

  const latestLedgerEntry = ledgerEntries[0];
  const outstandingBalance = latestLedgerEntry
    ? Number(latestLedgerEntry.running_balance)
    : Number(sale.total_price_locked);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Payment Request"
        description={`Create a secure Paystack payment link for ${sale.sale_reference}.`}
      />

      <DeveloperPaymentRequestForm
        saleId={sale.id}
        buyerEmail={sale.developer_buyers?.email ?? null}
        outstandingBalance={outstandingBalance}
        scheduleItems={scheduleItems}
      />

      <Link
        href={`/developer/sales/${sale.id}`}
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Sale
      </Link>
    </div>
  );
}
