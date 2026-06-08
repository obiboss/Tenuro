import { notFound } from "next/navigation";
import { DeveloperSaleDetail } from "@/components/developer/developer-sale-detail";
import { PageHeader } from "@/components/ui/page-header";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperSalePageProps = {
  params: Promise<{
    saleId: string;
  }>;
};

export default async function DeveloperSalePage({
  params,
}: DeveloperSalePageProps) {
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

  if (!sale) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={sale.sale_reference}
        description="Locked developer plot sale record."
      />

      <DeveloperSaleDetail sale={sale} />
    </div>
  );
}
