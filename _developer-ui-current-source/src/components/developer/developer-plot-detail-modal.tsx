"use client";

import { DeveloperEstateActionModal } from "@/components/developer/developer-estate-action-modal";
import { DeveloperPlotQuickStatusForm } from "@/components/developer/developer-plot-quick-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/money/naira";
import {
  getPlotStatusLabel,
  getPlotStatusTone,
  isPlotLockedForBulkUpdate,
} from "@/lib/developer/plot-status";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotDetailModalProps = {
  open: boolean;
  plot: DeveloperPlotRow | null;
  buyerName: string | null;
  estateId: string;
  onClose: () => void;
  onUpdatePlot: (plot: DeveloperPlotRow) => void;
  onStartBuyerPurchase: (plot: DeveloperPlotRow) => void;
  onSuccessfulChange: () => void;
};

export function DeveloperPlotDetailModal({
  open,
  plot,
  buyerName,
  estateId,
  onClose,
  onUpdatePlot,
  onStartBuyerPurchase,
  onSuccessfulChange,
}: DeveloperPlotDetailModalProps) {
  if (!plot) {
    return null;
  }

  const isLocked = isPlotLockedForBulkUpdate(plot.status);
  const plotKind = plot.developer_plot_types?.type_name ?? "No kind saved yet";

  return (
    <DeveloperEstateActionModal
      open={open}
      title={plot.plot_number}
      description="Plot details and quick actions"
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={getPlotStatusTone(plot.status)}>
            {getPlotStatusLabel(plot.status)}
          </Badge>

          {buyerName ? (
            <p className="text-sm font-semibold text-text-muted">
              Buyer: {buyerName}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plot size</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {plot.size_label}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Selling price</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {formatNaira(Number(plot.price))}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Plot kind</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {plotKind}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Buyer</p>
            <p className="mt-2 text-base font-black text-text-strong">
              {buyerName ?? "No buyer yet"}
            </p>
          </div>
        </div>

        {plot.notes ? (
          <div className="rounded-button border border-border-soft bg-white p-4">
            <p className="text-sm font-bold text-text-muted">Private note</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-strong">
              {plot.notes}
            </p>
          </div>
        ) : null}

        {isLocked ? (
          <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
            This plot is already linked to a buyer or sale.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => onUpdatePlot(plot)}>
            Update plot
          </Button>

          {plot.status === "available" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onStartBuyerPurchase(plot)}
            >
              Start buyer purchase
            </Button>
          ) : null}

          {!isLocked && plot.status !== "blocked" ? (
            <DeveloperPlotQuickStatusForm
              estateId={estateId}
              plotIds={[plot.id]}
              status="blocked"
              label="Mark as blocked"
              onSuccessfulUpdate={onSuccessfulChange}
            />
          ) : null}

          {!isLocked && plot.status === "blocked" ? (
            <DeveloperPlotQuickStatusForm
              estateId={estateId}
              plotIds={[plot.id]}
              status="available"
              label="Mark as available"
              onSuccessfulUpdate={onSuccessfulChange}
            />
          ) : null}
        </div>
      </div>
    </DeveloperEstateActionModal>
  );
}

export function getBuyerNameForPlot(
  assignments: DeveloperPlotAssignmentWithDetails[],
  plotId: string,
) {
  const assignment = assignments.find((item) => item.plot_id === plotId);

  return assignment?.developer_buyers?.full_name ?? null;
}
