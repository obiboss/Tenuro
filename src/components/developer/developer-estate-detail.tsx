import Link from "next/link";
import { DeveloperPlotGrid } from "@/components/developer/developer-plot-grid";
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

function getNextGuidance(params: {
  plotTypeCount: number;
  plotCount: number;
  availablePlotCount: number;
  buyerCount: number;
}) {
  if (params.plotCount === 0) {
    return {
      title: "Start by generating the plots for this estate.",
      body: "Enter the land size, number of plots, plot size, numbering style, and price. BOPA will create the plot numbers for you.",
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

  if (params.plotTypeCount === 0) {
    return {
      title: "Optional: save a common plot kind.",
      body: "You already have plots. You can still save common plot sizes and prices if this estate has different categories.",
    };
  }

  return {
    title: "You can now give a plot to a buyer.",
    body: "Choose the buyer and the plot below. After that, create the buyer’s sale and payment plan.",
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
        description="Prepare this estate for sales without adding plots one by one."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plots created</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {counts.total}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Available</p>
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
        title="Estate plot layout"
        description="Each box represents one plot. You can quickly see what is available, sold, reserved, or blocked."
      >
        <DeveloperPlotGrid plots={plots} assignments={assignments} />
      </SectionCard>

      <SectionCard
        title="Common plot sizes and prices"
        description="Optional saved plot categories for this estate."
      >
        {plotTypes.length === 0 ? (
          <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
            <p className="font-black text-text-strong">
              No saved plot kind yet.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              This is optional. Use it when the estate has different plot
              categories, such as standard plots, corner pieces, or commercial
              plots.
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

      <Link
        href="/developer/estates"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to Estates
      </Link>
    </div>
  );
}
