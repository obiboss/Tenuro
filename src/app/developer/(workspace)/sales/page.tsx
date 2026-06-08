import Link from "next/link";
import { DeveloperSalesList } from "@/components/developer/developer-sales-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { listDeveloperSales } from "@/server/repositories/developer-sales.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export default async function DeveloperSalesPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const sales = account ? await listDeveloperSales(supabase, account.id) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        description="Convert reserved buyer/plot assignments into locked sales."
        action={
          <Link href="/developer/sales/new">
            <Button>Create Sale</Button>
          </Link>
        }
      />

      <DeveloperSalesList sales={sales} />
    </div>
  );
}
