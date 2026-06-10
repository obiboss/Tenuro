import { Badge } from "@/components/ui/badge";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";
import { formatNaira } from "@/server/utils/money";

type DeveloperPlotGridProps = {
  plots: DeveloperPlotRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
};

function getBuyerNameForPlot(
  assignments: DeveloperPlotAssignmentWithDetails[],
  plotId: string,
) {
  const assignment = assignments.find((item) => item.plot_id === plotId);

  return assignment?.developer_buyers?.full_name ?? null;
}

function getStatusLabel(status: DeveloperPlotRow["status"]) {
  if (status === "available") {
    return "Available";
  }

  if (status === "reserved") {
    return "Given out";
  }

  if (status === "active") {
    return "Sale active";
  }

  if (status === "sold") {
    return "Sold";
  }

  return "Blocked";
}

function getStatusTone(status: DeveloperPlotRow["status"]) {
  if (status === "available") {
    return "success";
  }

  if (status === "blocked") {
    return "warning";
  }

  return "primary";
}

export function DeveloperPlotGrid({
  plots,
  assignments,
}: DeveloperPlotGridProps) {
  if (plots.length === 0) {
    return (
      <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
        <p className="font-black text-text-strong">
          No plot has been added yet.
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Use “Generate Plots” below to let BOPA create the plot numbers for
          this estate.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {plots.map((plot) => {
        const buyerName = getBuyerNameForPlot(assignments, plot.id);

        return (
          <div
            key={plot.id}
            className="rounded-button border border-border-soft bg-white p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-text-strong">
                  {plot.plot_number}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {plot.size_label}
                </p>
              </div>

              <Badge tone={getStatusTone(plot.status)}>
                {getStatusLabel(plot.status)}
              </Badge>
            </div>

            <p className="mt-4 text-base font-black text-text-strong">
              {formatNaira(Number(plot.price))}
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {buyerName ? `Buyer: ${buyerName}` : "No buyer yet"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
