"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { ChevronDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  groupDeveloperPlots,
  plotMatchesSearch,
} from "@/lib/developer/plot-grouping";
import {
  getPlotStatusLabel,
  isPlotLockedForBulkUpdate,
  matchesPlotStatusFilter,
  type PlotStatusFilter,
} from "@/lib/developer/plot-status";
import { cn } from "@/lib/cn";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

const TILES_PER_GROUP_BATCH = 60;

type DeveloperPlotOverviewProps = {
  plots: DeveloperPlotRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
  selectionMode: boolean;
  selectedPlotIds: string[];
  onSelectionModeChange: (enabled: boolean) => void;
  onSelectedPlotIdsChange: (plotIds: string[]) => void;
  onPlotOpen: (plot: DeveloperPlotRow) => void;
  onPlotUpdate: (plot: DeveloperPlotRow) => void;
  onPlotQuickStatus: (
    plot: DeveloperPlotRow,
    status: "available" | "blocked",
  ) => void;
  onPlotStartPurchase: (plot: DeveloperPlotRow) => void;
};

type PlotTileMenuState = {
  plotId: string;
  x: number;
  y: number;
} | null;

function hasBuyerLinked(
  assignments: DeveloperPlotAssignmentWithDetails[],
  plot: DeveloperPlotRow,
) {
  return (
    isPlotLockedForBulkUpdate(plot.status) ||
    assignments.some((assignment) => assignment.plot_id === plot.id)
  );
}

export function DeveloperPlotOverview({
  plots,
  assignments,
  selectionMode,
  selectedPlotIds,
  onSelectionModeChange,
  onSelectedPlotIdsChange,
  onPlotOpen,
  onPlotUpdate,
  onPlotQuickStatus,
  onPlotStartPurchase,
}: DeveloperPlotOverviewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlotStatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [visibleCountsByGroup, setVisibleCountsByGroup] = useState<
    Record<string, number>
  >({});
  const [menuState, setMenuState] = useState<PlotTileMenuState>(null);

  const allGroups = useMemo(() => groupDeveloperPlots(plots), [plots]);

  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      if (!plotMatchesSearch(plot, searchQuery)) {
        return false;
      }

      if (!matchesPlotStatusFilter(plot.status, statusFilter)) {
        return false;
      }

      if (groupFilter !== "all") {
        const plotGroup = allGroups.find((group) =>
          group.plots.some((groupPlot) => groupPlot.id === plot.id),
        );

        if (!plotGroup || plotGroup.id !== groupFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allGroups, groupFilter, plots, searchQuery, statusFilter]);

  const visibleGroups = useMemo(() => {
    const filteredPlotIds = new Set(filteredPlots.map((plot) => plot.id));

    return allGroups
      .map((group) => ({
        ...group,
        plots: group.plots.filter((plot) => filteredPlotIds.has(plot.id)),
      }))
      .filter((group) => group.plots.length > 0);
  }, [allGroups, filteredPlots]);

  const selectedPlotIdSet = useMemo(
    () => new Set(selectedPlotIds),
    [selectedPlotIds],
  );

  const defaultExpandedGroupId = visibleGroups[0]?.id ?? null;

  function isGroupExpanded(groupId: string) {
    if (expandedGroups.includes(groupId)) {
      return true;
    }

    if (expandedGroups.length === 0 && groupId === defaultExpandedGroupId) {
      return true;
    }

    return false;
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((currentGroups) => {
      const isCurrentlyExpanded = isGroupExpanded(groupId);

      if (isCurrentlyExpanded) {
        return currentGroups.filter((group) => group !== groupId);
      }

      return [...currentGroups, groupId];
    });
  }

  function getVisiblePlotsForGroup(groupId: string, groupPlots: DeveloperPlotRow[]) {
    const visibleCount =
      visibleCountsByGroup[groupId] ?? TILES_PER_GROUP_BATCH;

    return groupPlots.slice(0, visibleCount);
  }

  function showMoreInGroup(groupId: string, totalPlots: number) {
    setVisibleCountsByGroup((currentCounts) => {
      const currentCount = currentCounts[groupId] ?? TILES_PER_GROUP_BATCH;

      return {
        ...currentCounts,
        [groupId]: Math.min(currentCount + TILES_PER_GROUP_BATCH, totalPlots),
      };
    });
  }

  function togglePlotSelection(plotId: string) {
    if (selectedPlotIdSet.has(plotId)) {
      onSelectedPlotIdsChange(
        selectedPlotIds.filter((selectedPlotId) => selectedPlotId !== plotId),
      );
      return;
    }

    onSelectedPlotIdsChange([...selectedPlotIds, plotId]);
  }

  function handleTileClick(plot: DeveloperPlotRow) {
    if (selectionMode) {
      togglePlotSelection(plot.id);
      return;
    }

    onPlotOpen(plot);
  }

  function openTileMenu(
    event: MouseEvent<HTMLButtonElement>,
    plot: DeveloperPlotRow,
  ) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();

    setMenuState({
      plotId: plot.id,
      x: rect.left,
      y: rect.bottom + 4,
    });
  }

  const activeMenuPlot = menuState
    ? plots.find((plot) => plot.id === menuState.plotId) ?? null
    : null;

  if (plots.length === 0) {
    return (
      <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
        <p className="font-black text-text-strong">No plots yet.</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Use Generate plots to let BOPA create the plot numbers for this
          estate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Search plot"
          name="plotSearch"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Example: A12 or Block B"
        />

        <div className="space-y-2">
          <label
            htmlFor="plotStatusFilter"
            className="block text-sm font-semibold text-text-strong"
          >
            Filter by status
          </label>

          <select
            id="plotStatusFilter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as PlotStatusFilter)
            }
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="plotGroupFilter"
            className="block text-sm font-semibold text-text-strong"
          >
            Filter by group
          </label>

          <select
            id="plotGroupFilter"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          >
            <option value="all">All groups</option>
            {allGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label} ({group.plots.length})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant={selectionMode ? "primary" : "secondary"}
            onClick={() => {
              onSelectionModeChange(!selectionMode);

              if (selectionMode) {
                onSelectedPlotIdsChange([]);
              }
            }}
            fullWidth
          >
            {selectionMode ? "Done selecting" : "Select plots"}
          </Button>
        </div>
      </div>

      {filteredPlots.length === 0 ? (
        <div className="rounded-button border border-dashed border-border-soft bg-background p-5">
          <p className="font-black text-text-strong">No plots match your search.</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Try another plot label, status, or group.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const expanded = isGroupExpanded(group.id);
            const visiblePlots = getVisiblePlotsForGroup(group.id, group.plots);
            const hasMoreInGroup = visiblePlots.length < group.plots.length;

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-button border border-border-soft bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-background"
                >
                  <div>
                    <p className="text-base font-black text-text-strong">
                      {group.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {group.plots.length} plot
                      {group.plots.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <ChevronDown
                    className={cn(
                      "shrink-0 text-text-muted transition",
                      expanded && "rotate-180",
                    )}
                    size={18}
                  />
                </button>

                {expanded ? (
                  <div className="border-t border-border-soft px-4 py-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                      {visiblePlots.map((plot) => {
                        const isSelected = selectedPlotIdSet.has(plot.id);
                        const buyerLinked = hasBuyerLinked(assignments, plot);

                        return (
                          <div key={plot.id} className="relative">
                            <button
                              type="button"
                              onClick={() => handleTileClick(plot)}
                              className={cn(
                                "flex min-h-[76px] w-full flex-col items-center justify-center rounded-button border px-2 py-3 text-center transition",
                                isSelected
                                  ? "border-primary bg-primary-soft ring-2 ring-primary-soft"
                                  : "border-border-soft bg-background hover:border-primary hover:bg-primary-soft/30",
                              )}
                            >
                              {selectionMode ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePlotSelection(plot.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`Select ${plot.plot_number}`}
                                  className="mb-2 h-4 w-4 rounded border-border-soft text-primary focus:ring-primary"
                                />
                              ) : null}

                              <span className="text-sm font-black text-text-strong">
                                {plot.plot_number}
                              </span>

                              <span className="mt-1 text-xs font-semibold text-text-muted">
                                {getPlotStatusLabel(plot.status)}
                              </span>

                              {buyerLinked ? (
                                <span
                                  aria-label="Linked to buyer"
                                  className="mt-2 size-2 rounded-full bg-primary"
                                />
                              ) : null}
                            </button>

                            {!selectionMode ? (
                              <button
                                type="button"
                                aria-label={`More actions for ${plot.plot_number}`}
                                onClick={(event) => openTileMenu(event, plot)}
                                className="absolute right-1 top-1 rounded-full p-1 text-text-muted transition hover:bg-white hover:text-text-strong"
                              >
                                <MoreVertical size={14} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {hasMoreInGroup ? (
                      <div className="mt-4 flex justify-center">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            showMoreInGroup(group.id, group.plots.length)
                          }
                        >
                          Show more in {group.label}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {menuState && activeMenuPlot ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40"
            onClick={() => setMenuState(null)}
          />

          <div
            className="fixed z-50 min-w-44 rounded-button border border-border-soft bg-white p-2 shadow-card"
            style={{ top: menuState.y, left: menuState.x }}
          >
            <button
              type="button"
              className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
              onClick={() => {
                onPlotOpen(activeMenuPlot);
                setMenuState(null);
              }}
            >
              View details
            </button>

            {isPlotLockedForBulkUpdate(activeMenuPlot.status) ? (
              <p className="px-3 py-2 text-xs font-semibold leading-5 text-text-muted">
                This plot is already linked to a buyer or sale.
              </p>
            ) : (
              <>
                {activeMenuPlot.status === "available" ? (
                  <button
                    type="button"
                    className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
                    onClick={() => {
                      onPlotStartPurchase(activeMenuPlot);
                      setMenuState(null);
                    }}
                  >
                    Start buyer purchase
                  </button>
                ) : null}

                <button
                  type="button"
                  className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
                  onClick={() => {
                    onPlotUpdate(activeMenuPlot);
                    setMenuState(null);
                  }}
                >
                  Update plot
                </button>

                <button
                  type="button"
                  className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
                  onClick={() => {
                    onPlotQuickStatus(
                      activeMenuPlot,
                      activeMenuPlot.status === "blocked"
                        ? "available"
                        : "blocked",
                    );
                    setMenuState(null);
                  }}
                >
                  {activeMenuPlot.status === "blocked"
                    ? "Mark as available"
                    : "Mark as blocked"}
                </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
