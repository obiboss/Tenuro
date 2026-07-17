import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DeveloperBuyersList } from "@/components/developer/developer-buyers-list";
import { listDeveloperBuyers } from "@/server/repositories/developer-buyers.repository";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export default async function DeveloperBuyersPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const buyers = account ? await listDeveloperBuyers(supabase, account.id) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Buyers"
        description="Create buyer records before assigning them to estate plots."
        action={
          <Link href="/developer/buyers/new">
            <Button>Add Buyer</Button>
          </Link>
        }
      />

      <DeveloperBuyersList buyers={buyers} />
    </div>
  );
}
