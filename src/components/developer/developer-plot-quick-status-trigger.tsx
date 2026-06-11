"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateBulkDeveloperPlotsAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import type { DeveloperPlotStatus } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotQuickStatusTriggerProps = {
  estateId: string;
  plotIds: string[];
  status: Extract<DeveloperPlotStatus, "available" | "blocked">;
  requestKey: number;
  onSuccessfulUpdate?: () => void;
  onFailedUpdate?: (message: string) => void;
};

export function DeveloperPlotQuickStatusTrigger({
  estateId,
  plotIds,
  status,
  requestKey,
  onSuccessfulUpdate,
  onFailedUpdate,
}: DeveloperPlotQuickStatusTriggerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const handledMessageRef = useRef<string | null>(null);
  const [state, formAction] = useActionState(
    updateBulkDeveloperPlotsAction,
    initialDeveloperPlotActionState,
  );

  useEffect(() => {
    if (plotIds.length === 0) {
      return;
    }

    formRef.current?.requestSubmit();
  }, [plotIds, requestKey, status]);

  useEffect(() => {
    if (!state.message || handledMessageRef.current === state.message) {
      return;
    }

    handledMessageRef.current = state.message;

    if (state.ok) {
      onSuccessfulUpdate?.();
      return;
    }

    onFailedUpdate?.(state.message);
  }, [onFailedUpdate, onSuccessfulUpdate, state.message, state.ok]);

  if (plotIds.length === 0) {
    return null;
  }

  return (
    <form ref={formRef} action={formAction} className="hidden">
      <input type="hidden" name="estateId" value={estateId} />
      <input type="hidden" name="plotIds" value={plotIds.join(",")} />
      <input type="hidden" name="status" value={status} />
    </form>
  );
}
