import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { listDeveloperEstates } from "@/server/repositories/developer-estates.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function getPlotCounts(
  plots: {
    id: string;
    status: "available" | "reserved" | "active" | "sold" | "blocked";
  }[],
) {
  return plots.reduce(
    (accumulator, plot) => {
      accumulator.total += 1;
      accumulator[plot.status] += 1;
      return accumulator;
    },
    {
      total: 0,
      available: 0,
      reserved: 0,
      active: 0,
      sold: 0,
      blocked: 0,
    },
  );
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default async function DeveloperEstatesPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const estates = account
    ? await listDeveloperEstates(supabase, account.id)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Estates"
        description="Create and manage developer estate projects and their plot inventory."
        action={
          <Link href="/developer/estates/new">
            <Button>Create Estate</Button>
          </Link>
        }
      />

      <SectionCard
        title="Estate Inventory"
        description="Each estate contains plot types and individual plots."
      >
        {estates.length === 0 ? (
          <div className="rounded-button bg-background p-6 text-center">
            <p className="text-base font-black text-text-strong">
              No estates yet
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Create your first estate to begin managing plot inventory.
            </p>

            <Link
              href="/developer/estates/new"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
            >
              Create Estate
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {estates.map((estate) => {
              const counts = getPlotCounts(estate.developer_plots);

              return (
                <Link
                  key={estate.id}
                  href={`/developer/estates/${estate.id}`}
                  className="rounded-card border border-border-soft bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-text-strong">
                        {estate.estate_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {estate.location}
                      </p>
                    </div>

                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                      {formatStatus(estate.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">Plots</p>
                      <p className="mt-1 text-xl font-black text-text-strong">
                        {counts.total}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Available
                      </p>
                      <p className="mt-1 text-xl font-black text-text-strong">
                        {counts.available}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">Sold</p>
                      <p className="mt-1 text-xl font-black text-text-strong">
                        {counts.sold}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
