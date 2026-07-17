import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeveloperPaymentPlanForm } from "@/components/developer/developer-payment-plan-form";
import { PageHeader } from "@/components/ui/page-header";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getActiveDeveloperPaymentPlanForSale } from "@/server/repositories/developer-payment-plans.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperSalePaymentPlanPageProps = {
  params: Promise<{
    saleId: string;
  }>;
};

export default async function DeveloperSalePaymentPlanPage({
  params,
}: DeveloperSalePaymentPlanPageProps) {
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

  const existingPlan = await getActiveDeveloperPaymentPlanForSale(supabase, {
    developerAccountId: account.id,
    saleId: sale.id,
  });

  if (existingPlan) {
    redirect(`/developer/sales/${sale.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Payment Plan"
        description={`Build the expected payment schedule for ${sale.sale_reference}.`}
      />

      <DeveloperPaymentPlanForm
        saleId={sale.id}
        lockedSalePrice={Number(sale.total_price_locked)}
        initialMode={sale.payment_plan_mode}
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
