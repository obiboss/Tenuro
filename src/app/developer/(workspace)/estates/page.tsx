import Link from "next/link";
import { ArrowRight, Building2, Map, ShoppingBag } from "lucide-react";
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
        description="View your estate projects, check plot availability, and open an estate to manage buyers and sales."
        action={
          <Link href="/developer/estates/new">
            <Button>Create Estate</Button>
          </Link>
        }
      />

      <SectionCard
        title="Estate Inventory"
        description="Each estate contains its own plots, buyer activity, reservations, and sales records."
      >
        {estates.length === 0 ? (
          <div className="rounded-card border border-border-soft bg-background p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Building2 aria-hidden="true" size={24} strokeWidth={2.6} />
            </div>

            <p className="mt-4 text-base font-black text-text-strong">
              No estates yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-text-muted">
              Create your first estate to begin setting up the estate record and
              its plot inventory.
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
                <article
                  key={estate.id}
                  className="rounded-card border border-border-soft bg-white p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-text-strong">
                        {estate.estate_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-muted">
                        {estate.location}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                      {formatStatus(estate.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-button bg-background p-3">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Map aria-hidden="true" size={16} strokeWidth={2.6} />
                        <p className="text-xs font-bold">Plots</p>
                      </div>
                      <p className="mt-2 text-xl font-black text-text-strong">
                        {counts.total}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <p className="text-xs font-bold text-text-muted">
                        Available
                      </p>
                      <p className="mt-2 text-xl font-black text-text-strong">
                        {counts.available}
                      </p>
                    </div>

                    <div className="rounded-button bg-background p-3">
                      <div className="flex items-center gap-2 text-text-muted">
                        <ShoppingBag
                          aria-hidden="true"
                          size={16}
                          strokeWidth={2.6}
                        />
                        <p className="text-xs font-bold">Sold</p>
                      </div>
                      <p className="mt-2 text-xl font-black text-text-strong">
                        {counts.sold}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Link
                      href={`/developer/estates/${estate.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
                    >
                      View estate
                      <ArrowRight
                        aria-hidden="true"
                        size={17}
                        strokeWidth={2.8}
                      />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
