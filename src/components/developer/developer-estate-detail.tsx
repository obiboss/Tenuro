import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { DeveloperEstateRow } from "@/server/repositories/developer-estates.repository";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type {
  DeveloperPlotRow,
  DeveloperPlotTypeRow,
} from "@/server/repositories/developer-plots.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperEstateDetailProps = {
  estate: DeveloperEstateRow;
  plotTypes: DeveloperPlotTypeRow[];
  plots: DeveloperPlotRow[];
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

export function DeveloperEstateDetail({
  estate,
  plotTypes,
  plots,
  assignments,
}: DeveloperEstateDetailProps) {
  const counts = getPlotCounts(plots);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Estate Summary"
        description="Inventory overview for this estate."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Total plots</p>
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
            <p className="text-sm font-bold text-text-muted">Reserved</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {counts.reserved}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
          {estate.estate_name} is currently marked as{" "}
          <span className="font-black">{formatStatus(estate.status)}</span>.
        </div>
      </SectionCard>

      <SectionCard
        title="Plot Types"
        description="Reusable pricing and size templates for this estate."
      >
        {plotTypes.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">
            No plot types yet.
          </p>
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
        title="Plots"
        description="Individual estate plots and their current inventory status."
      >
        {plots.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">
            No plots have been added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-3 pr-4 font-black">Plot</th>
                  <th className="py-3 pr-4 font-black">Type</th>
                  <th className="py-3 pr-4 font-black">Size</th>
                  <th className="py-3 pr-4 font-black">Price</th>
                  <th className="py-3 pr-4 font-black">Assigned Buyer</th>
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
                        {buyerName ?? "—"}
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
