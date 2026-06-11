"use client";

import { useState } from "react";
import { DeveloperBulkPlotUpdateForm } from "@/components/developer/developer-bulk-plot-update-form";
import { DeveloperPlotGrid } from "@/components/developer/developer-plot-grid";
import { SectionCard } from "@/components/ui/section-card";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotLayoutSectionProps = {
  estateId: string;
  plots: DeveloperPlotRow[];
  assignments: DeveloperPlotAssignmentWithDetails[];
};

export function DeveloperPlotLayoutSection({
  estateId,
  plots,
  assignments,
}: DeveloperPlotLayoutSectionProps) {
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Estate plot layout"
        description="Each box represents one plot. Select plots to update their size, price, status, or kind."
      >
        <DeveloperPlotGrid
          key={plots.length}
          plots={plots}
          assignments={assignments}
          selectedPlotIds={selectedPlotIds}
          onSelectedPlotIdsChange={setSelectedPlotIds}
        />
      </SectionCard>

      <SectionCard
        title="Update selected plots"
        description="Change one plot or many plots at once. Leave a field blank to keep what is already saved."
      >
        <DeveloperBulkPlotUpdateForm
          estateId={estateId}
          selectedPlotIds={selectedPlotIds}
          onSuccessfulUpdate={() => setSelectedPlotIds([])}
        />
      </SectionCard>
    </div>
  );
}
