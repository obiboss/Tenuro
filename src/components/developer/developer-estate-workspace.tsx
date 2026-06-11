"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DeveloperBulkPlotForm } from "@/components/developer/developer-bulk-plot-form";
import { DeveloperEstateActionModal } from "@/components/developer/developer-estate-action-modal";
import {
  DeveloperPlotDetailModal,
  getBuyerNameForPlot,
} from "@/components/developer/developer-plot-detail-modal";
import { DeveloperPlotAssignmentForm } from "@/components/developer/developer-plot-assignment-form";
import { DeveloperPlotBulkUpdateForm } from "@/components/developer/developer-plot-bulk-update-form";
import { DeveloperPlotForm } from "@/components/developer/developer-plot-form";
import { DeveloperPlotOverview } from "@/components/developer/developer-plot-overview";
import { DeveloperPlotQuickStatusForm } from "@/components/developer/developer-plot-quick-status-form";
import { DeveloperPlotQuickStatusTrigger } from "@/components/developer/developer-plot-quick-status-trigger";
import { DeveloperPlotTypeForm } from "@/components/developer/developer-plot-type-form";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { isPlotLockedForBulkUpdate } from "@/lib/developer/plot-status";
import type { DeveloperBuyerRow } from "@/server/repositories/developer-buyers.repository";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type {
  DeveloperPlotRow,
  DeveloperPlotTypeRow,
} from "@/server/repositories/developer-plots.repository";

type DeveloperEstateWorkspaceProps = {
  estate: {
    id: string;
    name: string;
    location: string;
  };
  plotTypes: DeveloperPlotTypeRow[];
  plots: DeveloperPlotRow[];
  availablePlots: DeveloperPlotRow[];
  buyers: DeveloperBuyerRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
};

type ActiveModal =
  | "generate"
  | "assign"
  | "update"
  | "special-plot"
  | "plot-kind"
  | "more-actions"
  | null;

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

function getGuidance(params: {
  plotCount: number;
  buyerCount: number;
  availablePlotCount: number;
}) {
  if (params.plotCount === 0) {
    return {
      title: "Start by generating the plots for this estate.",
      body: "Enter the land size, number of plots, plot size, numbering style, and price. BOPA will create the plot numbers for you.",
    };
  }

  if (params.buyerCount === 0) {
    return {
      title: "Your plots are ready. Add a buyer, then give them a plot.",
      body: "Create a buyer from the Buyers page, then come back here to give that buyer one of your available plots.",
    };
  }

  if (params.availablePlotCount === 0) {
    return {
      title: "There are no available plots right now.",
      body: "You can update plot details, generate more plots, or review plots that are already given out or sold.",
    };
  }

  return {
    title: "You can now give a plot to a buyer or update selected plots.",
    body: "Search for a plot, open its details, or select several plots and update them together.",
  };
}

export function DeveloperEstateWorkspace({
  estate,
  plotTypes,
  plots,
  availablePlots,
  buyers,
  assignments,
}: DeveloperEstateWorkspaceProps) {
  const router = useRouter();
  const counts = getPlotCounts(plots);
  const guidance = getGuidance({
    plotCount: plots.length,
    buyerCount: buyers.length,
    availablePlotCount: availablePlots.length,
  });

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [detailPlot, setDetailPlot] = useState<DeveloperPlotRow | null>(null);
  const [updatePlotIds, setUpdatePlotIds] = useState<string[]>([]);
  const [updatePlotLabel, setUpdatePlotLabel] = useState<string | undefined>();
  const [assignPlotId, setAssignPlotId] = useState("");
  const [quickStatusRequest, setQuickStatusRequest] = useState<{
    plotIds: string[];
    status: "available" | "blocked";
    requestKey: number;
  } | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedPlots = useMemo(
    () => plots.filter((plot) => selectedPlotIds.includes(plot.id)),
    [plots, selectedPlotIds],
  );

  const lockedSelectedPlots = selectedPlots.filter((plot) =>
    isPlotLockedForBulkUpdate(plot.status),
  );

  const refreshWorkspace = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleModalSuccess = useCallback(() => {
    setActiveModal(null);
    setDetailPlot(null);
    setSelectionMode(false);
    setSelectedPlotIds([]);
    setUpdatePlotIds([]);
    setAssignPlotId("");
    refreshWorkspace();
  }, [refreshWorkspace]);

  function openUpdateModal(plotIds: string[], plotLabel?: string) {
    setUpdatePlotIds(plotIds);
    setUpdatePlotLabel(plotLabel);
    setActiveModal("update");
  }

  function openAssignModal(plot?: DeveloperPlotRow) {
    setAssignPlotId(plot?.id ?? "");
    setActiveModal("assign");
  }

  function triggerQuickStatus(
    plotIds: string[],
    status: "available" | "blocked",
  ) {
    setQuickStatusRequest({
      plotIds,
      status,
      requestKey: Date.now(),
    });
  }

  function openBulkUpdate(plotIds: string[], plotLabel?: string) {
    const unlockedPlotIds = plotIds.filter((plotId) => {
      const plot = plots.find((item) => item.id === plotId);

      return plot ? !isPlotLockedForBulkUpdate(plot.status) : false;
    });

    if (unlockedPlotIds.length === 0) {
      setActionMessage(
        "Some selected plots are already linked to a buyer or sale. Remove them before updating.",
      );
      return;
    }

    if (unlockedPlotIds.length !== plotIds.length) {
      setActionMessage(
        "Some selected plots are already linked to a buyer or sale. Remove them before updating.",
      );
      return;
    }

    setActionMessage(null);
    openUpdateModal(unlockedPlotIds, plotLabel);
  }

  const detailBuyerName = detailPlot
    ? getBuyerNameForPlot(assignments, detailPlot.id)
    : null;

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-text-strong sm:text-3xl">
          {estate.name}
        </h1>
        <p className="text-sm font-semibold text-text-muted">{estate.location}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Plots created", value: counts.total },
          { label: "Available", value: counts.available },
          {
            label: "Given to buyers",
            value: counts.reserved,
          },
          {
            label: "Sold/active",
            value: counts.active + counts.sold,
          },
          { label: "Blocked", value: counts.blocked },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-button border border-border-soft bg-white p-4"
          >
            <p className="text-xs font-bold text-text-muted sm:text-sm">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-black text-text-strong sm:text-2xl">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-button bg-primary-soft p-4">
        <p className="text-sm font-black text-primary">{guidance.title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-primary">
          {guidance.body}
        </p>
      </div>

      {actionMessage ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {actionMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => setActiveModal("generate")}>
          Generate plots
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => openAssignModal()}
          disabled={buyers.length === 0 || availablePlots.length === 0}
        >
          Give plot to buyer
        </Button>

        <Link
          href="/developer/buyers"
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-transparent px-5 py-2.5 text-sm font-semibold text-text-normal transition hover:bg-primary-soft"
        >
          Add buyer
        </Link>

        {selectedPlotIds.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => openBulkUpdate(selectedPlotIds)}
          >
            Update selected plots
          </Button>
        ) : null}

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMoreActions((current) => !current)}
          >
            More actions
            <ChevronDown size={16} />
          </Button>

          {showMoreActions ? (
            <div className="absolute left-0 top-full z-20 mt-2 min-w-52 rounded-button border border-border-soft bg-white p-2 shadow-card">
              <button
                type="button"
                className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
                onClick={() => {
                  setActiveModal("special-plot");
                  setShowMoreActions(false);
                }}
              >
                Add one special plot
              </button>

              <button
                type="button"
                className="block w-full rounded-button px-3 py-2 text-left text-sm font-semibold text-text-strong hover:bg-background"
                onClick={() => {
                  setActiveModal("plot-kind");
                  setShowMoreActions(false);
                }}
              >
                Save a common plot kind
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {plots.length > 0 ? (
        <SectionCard
          title="Plot overview"
          description="Search, filter, and open a plot to see full details."
        >
          <DeveloperPlotOverview
            plots={plots}
            assignments={assignments}
            selectionMode={selectionMode}
            selectedPlotIds={selectedPlotIds}
            onSelectionModeChange={setSelectionMode}
            onSelectedPlotIdsChange={setSelectedPlotIds}
            onPlotOpen={(plot) => setDetailPlot(plot)}
            onPlotUpdate={(plot) =>
              openBulkUpdate([plot.id], `Plot ${plot.plot_number}`)
            }
            onPlotQuickStatus={(plot, status) =>
              triggerQuickStatus([plot.id], status)
            }
          />
        </SectionCard>
      ) : null}

      <Link
        href="/developer/estates"
        className="inline-flex min-h-11 items-center justify-center rounded-button bg-surface px-5 py-2.5 text-sm font-extrabold text-text-strong shadow-soft ring-1 ring-border-soft transition hover:bg-primary-soft"
      >
        Back to estates
      </Link>

      {selectionMode && selectedPlotIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-white px-4 py-4 shadow-2xl sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-text-strong">
              {selectedPlotIds.length} plot
              {selectedPlotIds.length === 1 ? "" : "s"} selected
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => openBulkUpdate(selectedPlotIds)}
              >
                Update selected
              </Button>

              <DeveloperPlotQuickStatusForm
                estateId={estate.id}
                plotIds={selectedPlotIds.filter(
                  (plotId) =>
                    !isPlotLockedForBulkUpdate(
                      plots.find((plot) => plot.id === plotId)?.status ??
                        "available",
                    ),
                )}
                status="blocked"
                label="Mark as blocked"
                onSuccessfulUpdate={handleModalSuccess}
              />

              <DeveloperPlotQuickStatusForm
                estateId={estate.id}
                plotIds={selectedPlotIds.filter(
                  (plotId) =>
                    !isPlotLockedForBulkUpdate(
                      plots.find((plot) => plot.id === plotId)?.status ??
                        "available",
                    ),
                )}
                status="available"
                label="Mark as available"
                onSuccessfulUpdate={handleModalSuccess}
              />

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedPlotIds([]);
                  setSelectionMode(false);
                }}
              >
                Clear selection
              </Button>
            </div>
          </div>

          {lockedSelectedPlots.length > 0 ? (
            <p className="mx-auto mt-3 max-w-5xl text-sm font-semibold text-danger">
              Some selected plots are already linked to a buyer or sale. Remove
              them before updating.
            </p>
          ) : null}
        </div>
      ) : null}

      <DeveloperPlotDetailModal
        open={detailPlot !== null}
        plot={detailPlot}
        buyerName={detailBuyerName}
        estateId={estate.id}
        onClose={() => setDetailPlot(null)}
        onUpdatePlot={(plot) => {
          setDetailPlot(null);
          openBulkUpdate([plot.id], `Plot ${plot.plot_number}`);
        }}
        onGivePlotToBuyer={(plot) => {
          setDetailPlot(null);
          openAssignModal(plot);
        }}
        onSuccessfulChange={handleModalSuccess}
      />

      <DeveloperEstateActionModal
        open={activeModal === "generate"}
        title="Generate plots for this estate"
        description="Enter the land and plot details once. BOPA will create the plot numbers for you."
        onClose={() => setActiveModal(null)}
        size="lg"
      >
        <DeveloperBulkPlotForm
          estateId={estate.id}
          embedded
          onSuccess={handleModalSuccess}
        />
      </DeveloperEstateActionModal>

      <DeveloperEstateActionModal
        open={activeModal === "assign"}
        title="Give a plot to a buyer"
        description="Choose the buyer and the plot you want to give them."
        onClose={() => setActiveModal(null)}
        size="lg"
      >
        <DeveloperPlotAssignmentForm
          estateId={estate.id}
          buyers={buyers}
          plots={availablePlots}
          preselectedPlotId={assignPlotId}
          embedded
          onSuccess={handleModalSuccess}
        />
      </DeveloperEstateActionModal>

      <DeveloperEstateActionModal
        open={activeModal === "update"}
        title={
          updatePlotIds.length === 1 && updatePlotLabel
            ? `Update ${updatePlotLabel}`
            : "Update selected plots"
        }
        description="Fill only the fields you want to change."
        onClose={() => {
          setActiveModal(null);
          setUpdatePlotIds([]);
          setUpdatePlotLabel(undefined);
        }}
        size="lg"
      >
        {lockedSelectedPlots.length > 0 && updatePlotIds.length > 1 ? (
          <div className="rounded-button bg-danger-soft p-4 text-sm font-semibold text-danger">
            Some selected plots are already linked to a buyer or sale. Remove
            them before updating.
          </div>
        ) : (
          <DeveloperPlotBulkUpdateForm
            estateId={estate.id}
            selectedPlotIds={updatePlotIds}
            titlePlotLabel={updatePlotLabel}
            onSuccessfulUpdate={handleModalSuccess}
          />
        )}
      </DeveloperEstateActionModal>

      <DeveloperEstateActionModal
        open={activeModal === "special-plot"}
        title="Add one special plot"
        description="Use this only when you need a plot outside the generated list."
        onClose={() => setActiveModal(null)}
        size="lg"
      >
        <DeveloperPlotForm
          estateId={estate.id}
          plotTypes={plotTypes}
          embedded
          onSuccess={handleModalSuccess}
        />
      </DeveloperEstateActionModal>

      <DeveloperEstateActionModal
        open={activeModal === "plot-kind"}
        title="Save a common plot kind"
        description="Optional. Use this when the estate has different plot categories."
        onClose={() => setActiveModal(null)}
      >
        <DeveloperPlotTypeForm
          estateId={estate.id}
          embedded
          onSuccess={handleModalSuccess}
        />
      </DeveloperEstateActionModal>

      {quickStatusRequest ? (
        <DeveloperPlotQuickStatusTrigger
          estateId={estate.id}
          plotIds={quickStatusRequest.plotIds}
          status={quickStatusRequest.status}
          requestKey={quickStatusRequest.requestKey}
          onSuccessfulUpdate={() => {
            setQuickStatusRequest(null);
            handleModalSuccess();
          }}
          onFailedUpdate={(message) => {
            setQuickStatusRequest(null);
            setActionMessage(message);
          }}
        />
      ) : null}
    </div>
  );
}
