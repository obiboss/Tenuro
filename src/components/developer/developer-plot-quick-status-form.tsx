"use client";

import { useActionState, useEffect } from "react";
import { updateBulkDeveloperPlotsAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { Button } from "@/components/ui/button";
import type { DeveloperPlotStatus } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotQuickStatusFormProps = {
  estateId: string;
  plotIds: string[];
  status: Extract<DeveloperPlotStatus, "available" | "blocked">;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  onSuccessfulUpdate?: () => void;
};

export function DeveloperPlotQuickStatusForm({
  estateId,
  plotIds,
  status,
  label,
  variant = "secondary",
  onSuccessfulUpdate,
}: DeveloperPlotQuickStatusFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateBulkDeveloperPlotsAction,
    initialDeveloperPlotActionState,
  );

  useEffect(() => {
    if (state.ok) {
      onSuccessfulUpdate?.();
    }
  }, [onSuccessfulUpdate, state.ok]);

  if (plotIds.length === 0) {
    return null;
  }

  return (
    <form action={formAction} className="inline-flex flex-col gap-2">
      <input type="hidden" name="estateId" value={estateId} />
      <input type="hidden" name="plotIds" value={plotIds.join(",")} />
      <input type="hidden" name="status" value={status} />

      <Button type="submit" variant={variant} isLoading={isPending}>
        {label}
      </Button>

      {state.message && !state.ok ? (
        <p className="text-sm font-medium text-danger">{state.message}</p>
      ) : null}
    </form>
  );
}
