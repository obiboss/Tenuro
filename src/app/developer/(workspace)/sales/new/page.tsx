import Link from "next/link";
import { DeveloperSaleForm } from "@/components/developer/developer-sale-form";
import { PageHeader } from "@/components/ui/page-header";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { listReservedDeveloperPlotAssignments } from "@/server/repositories/developer-plot-assignments.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export default async function NewDeveloperSalePage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const assignments = account
    ? await listReservedDeveloperPlotAssignments(supabase, account.id)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Sale"
        description="Convert a reserved buyer/plot assignment into an active sale with a locked sale price."
      />

      <DeveloperSaleForm assignments={assignments} />

      <Link
        href="/developer/sales"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Sales
      </Link>
    </div>
  );
}
