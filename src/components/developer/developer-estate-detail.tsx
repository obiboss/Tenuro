import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { DeveloperBuyerRow } from "@/server/repositories/developer-buyers.repository";

import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type {
  DeveloperPlotRow,
  DeveloperPlotTypeRow,
} from "@/server/repositories/developer-plots.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperEstateDetailProps = {
  plotTypes: DeveloperPlotTypeRow[];
  plots: DeveloperPlotRow[];
  availablePlots: DeveloperPlotRow[];
  buyers: DeveloperBuyerRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function getPlotCounts(plots: DeveloperPlotRow[]) {
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

function getBuyerNameForPlot(
  assignments: DeveloperPlotAssignmentWithDetails[],
  plotId: string,
) {
  const assignment = assignments.find((item) => item.plot_id === plotId);

  return assignment?.developer_buyers?.full_name ?? null;
}

function getNextGuidance(params: {
  plotTypeCount: number;
  plotCount: number;
  availablePlotCount: number;
  buyerCount: number;
}) {
  if (params.plotTypeCount === 0) {
    return {
      title: "Start by describing the kind of plots you sell.",
      body: "Add a simple plot category such as 500 sqm Residential Plot. This helps you reuse the same size and price when adding plot numbers.",
    };
  }

  if (params.plotCount === 0) {
    return {
      title: "Now add the actual plot numbers.",
      body: "Add plots like A1, A2, B3, or Plot 12. Buyers cannot be given a plot until at least one available plot exists.",
    };
  }

  if (params.buyerCount === 0) {
    return {
      title: "Add a buyer before giving out a plot.",
      body: "Create a buyer record from the Buyers page, then return here to give that buyer one of the available plots.",
    };
  }

  if (params.availablePlotCount === 0) {
    return {
      title: "There are no available plots to give out.",
      body: "Add more plots or check existing plot statuses before assigning a plot to a buyer.",
    };
  }

  return {
    title: "You can now give a plot to a buyer.",
    body: "Use the form below to choose the buyer and the plot. After that, create the buyer’s sale and payment plan.",
  };
}

export function DeveloperEstateDetail({
  plotTypes,
  plots,
  availablePlots,
  buyers,
  assignments,
}: DeveloperEstateDetailProps) {
  const counts = getPlotCounts(plots);
  const guidance = getNextGuidance({
    plotTypeCount: plotTypes.length,
    plotCount: plots.length,
    availablePlotCount: availablePlots.length,
    buyerCount: buyers.length,
  });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Estate setup"
        description="Follow these steps to prepare this estate for buyer sales."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plots added</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {counts.total}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Ready to sell</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {counts.available}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Given to buyers</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {counts.reserved + counts.active + counts.sold}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-button bg-primary-soft p-4">
          <p className="text-sm font-black text-primary">{guidance.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-primary">
            {guidance.body}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Types of plots in this estate"
        description="These are the common plot sizes and prices you sell in this estate."
      >
        {plotTypes.length === 0 ? (
          <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
            <p className="font-black text-text-strong">
              No plot type has been added yet.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Start with a simple description like “500 sqm Residential Plot”.
              This makes it easier to add the actual plot numbers next.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {plotTypes.map((plotType) => (
              <div
                key={plotType.id}
                className="rounded-button border border-border-soft bg-white p-4"
              >
                <p className="font-black text-text-strong">
                  {plotType.type_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {plotType.size_label}
                </p>
                <p className="mt-3 text-lg font-black text-text-strong">
                  {formatNaira(Number(plotType.default_price))}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Plots in this estate"
        description="These are the actual plot numbers and who they are currently linked to."
      >
        {plots.length === 0 ? (
          <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
            <p className="font-black text-text-strong">
              No plot has been added yet.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Add the actual plot numbers below. Once plots are added, you can
              give one to a buyer and create the buyer’s payment plan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Plot</th>
                  <th className="py-3 pr-4 font-black">Kind of plot</th>
                  <th className="py-3 pr-4 font-black">Size</th>
                  <th className="py-3 pr-4 font-black">Price</th>
                  <th className="py-3 pr-4 font-black">Buyer</th>
                  <th className="py-3 pr-4 font-black">Status</th>
                </tr>
              </thead>

              <tbody>
                {plots.map((plot) => {
                  const buyerName = getBuyerNameForPlot(assignments, plot.id);

                  return (
                    <tr key={plot.id} className="border-b border-border-soft">
                      <td className="py-4 pr-4 font-black text-text-strong">
                        {plot.plot_number}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-text-muted">
                        {plot.developer_plot_types?.type_name ?? "—"}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-text-muted">
                        {plot.size_label}
                      </td>
                      <td className="py-4 pr-4 font-black text-text-strong">
                        {formatNaira(Number(plot.price))}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-text-muted">
                        {buyerName ?? "Not given yet"}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge tone="primary">
                          {formatStatus(plot.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Link
        href="/developer/estates"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Estates
      </Link>
    </div>
  );
}
