"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { formatNairaCompact } from "@/lib/money/naira";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotGridProps = {
  plots: DeveloperPlotRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
  selectedPlotIds: string[];
  onSelectedPlotIdsChange: (plotIds: string[]) => void;
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

function getPlotKindLabel(plot: DeveloperPlotRow) {
  return plot.developer_plot_types?.type_name ?? "No kind saved yet";
}

export function DeveloperPlotGrid({
  plots,
  assignments,
  selectedPlotIds,
  onSelectedPlotIdsChange,
}: DeveloperPlotGridProps) {
  const [lastSelectedPlotId, setLastSelectedPlotId] = useState<string | null>(
    null,
  );

  const selectedPlotIdSet = useMemo(
    () => new Set(selectedPlotIds),
    [selectedPlotIds],
  );

  function togglePlotSelection(plotId: string) {
    if (selectedPlotIdSet.has(plotId)) {
      onSelectedPlotIdsChange(
        selectedPlotIds.filter((selectedPlotId) => selectedPlotId !== plotId),
      );
      return;
    }

    onSelectedPlotIdsChange([...selectedPlotIds, plotId]);
  }

  function handlePlotCardClick(
    plotId: string,
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (event.shiftKey && lastSelectedPlotId) {
      const plotIds = plots.map((plot) => plot.id);
      const startIndex = plotIds.indexOf(lastSelectedPlotId);
      const endIndex = plotIds.indexOf(plotId);

      if (startIndex === -1 || endIndex === -1) {
        togglePlotSelection(plotId);
        setLastSelectedPlotId(plotId);
        return;
      }

      const rangeStart = Math.min(startIndex, endIndex);
      const rangeEnd = Math.max(startIndex, endIndex);
      const rangePlotIds = plotIds.slice(rangeStart, rangeEnd + 1);
      const mergedSelection = new Set([...selectedPlotIds, ...rangePlotIds]);

      onSelectedPlotIdsChange(Array.from(mergedSelection));
      setLastSelectedPlotId(plotId);
      return;
    }

    togglePlotSelection(plotId);
    setLastSelectedPlotId(plotId);
  }

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
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-muted">
        {selectedPlotIds.length} plot
        {selectedPlotIds.length === 1 ? "" : "s"} selected. Click a plot to
        select it. Hold Shift and click to select a range.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plots.map((plot) => {
          const buyerName = getBuyerNameForPlot(assignments, plot.id);
          const isSelected = selectedPlotIdSet.has(plot.id);

          return (
            <div
              key={plot.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={(event) => handlePlotCardClick(plot.id, event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePlotSelection(plot.id);
                  setLastSelectedPlotId(plot.id);
                }
              }}
              className={
                isSelected
                  ? "rounded-button border-2 border-primary bg-primary-soft p-4 shadow-soft outline-none ring-2 ring-primary-soft"
                  : "rounded-button border border-border-soft bg-white p-4 shadow-soft outline-none transition hover:border-primary hover:bg-primary-soft/40"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePlotSelection(plot.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${plot.plot_number}`}
                    className="mt-1 h-4 w-4 rounded border-border-soft text-primary focus:ring-primary"
                  />

                  <div>
                    <p className="text-lg font-black text-text-strong">
                      {plot.plot_number}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {plot.size_label}
                    </p>
                  </div>
                </div>

                <Badge tone={getStatusTone(plot.status)}>
                  {getStatusLabel(plot.status)}
                </Badge>
              </div>

              <p className="mt-3 text-sm font-semibold text-text-muted">
                {getPlotKindLabel(plot)}
              </p>

              <p className="mt-2 text-base font-black text-text-strong">
                {formatNairaCompact(Number(plot.price))}
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {buyerName ? `Buyer: ${buyerName}` : "No buyer yet"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
