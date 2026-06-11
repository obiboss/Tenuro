"use client";

import { useActionState, useEffect, useState } from "react";
import { updateBulkDeveloperPlotsAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { DeveloperMoneyInput } from "@/components/developer/developer-money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeveloperPlotBulkUpdateFormProps = {
  estateId: string;
  selectedPlotIds: string[];
  titlePlotLabel?: string;
  onSuccessfulUpdate?: () => void;
};

export function DeveloperPlotBulkUpdateForm({
  estateId,
  selectedPlotIds,
  titlePlotLabel,
  onSuccessfulUpdate,
}: DeveloperPlotBulkUpdateFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateBulkDeveloperPlotsAction,
    initialDeveloperPlotActionState,
  );
  const [priceDisplay, setPriceDisplay] = useState("");

  useEffect(() => {
    if (state.ok) {
      onSuccessfulUpdate?.();
    }
  }, [onSuccessfulUpdate, state.ok]);

  const selectedCount = selectedPlotIds.length;
  const canSubmit = selectedCount > 0;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="estateId" value={estateId} />
      <input type="hidden" name="plotIds" value={selectedPlotIds.join(",")} />

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
        {selectedCount === 0
          ? "Select one or more plots, then set the changes you want BOPA to apply."
          : selectedCount === 1
            ? titlePlotLabel
              ? `You are updating ${titlePlotLabel}. Fill only the fields you want to change.`
              : "You selected 1 plot. Fill only the fields you want to change."
            : `You selected ${selectedCount} plots. Fill only the fields you want to change.`}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="What kind of plots are these?"
          name="plotKindName"
          placeholder="Example: Standard Plot or Corner Piece"
          error={state.fieldErrors?.plotKindName?.[0]}
          disabled={!canSubmit}
        />

        <Input
          label="Plot size"
          name="sizeLabel"
          placeholder="Example: 500 sqm"
          error={state.fieldErrors?.sizeLabel?.[0]}
          disabled={!canSubmit}
        />

        <DeveloperMoneyInput
          label="Selling price"
          value={priceDisplay}
          onChange={setPriceDisplay}
          hiddenInputName="price"
          error={state.fieldErrors?.price?.[0]}
        />

        <div className="space-y-2">
          <label
            htmlFor="bulkPlotStatus"
            className="block text-sm font-semibold text-text-strong"
          >
            Can these plots be sold now?
          </label>

          <select
            id="bulkPlotStatus"
            name="status"
            defaultValue=""
            disabled={!canSubmit}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
          >
            <option value="">Keep current status</option>
            <option value="available">Available</option>
            <option value="blocked">Blocked</option>
          </select>

          {state.fieldErrors?.status?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.status[0]}
            </p>
          ) : null}
        </div>
      </div>

      <Input
        label="Private note"
        name="notes"
        placeholder="Optional"
        error={state.fieldErrors?.notes?.[0]}
        disabled={!canSubmit}
      />

      {state.fieldErrors?.plotIds?.[0] ? (
        <p className="text-sm font-medium text-danger">
          {state.fieldErrors.plotIds[0]}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending} disabled={!canSubmit}>
          {selectedCount <= 1 ? "Save changes" : "Update selected plots"}
        </Button>
      </div>
    </form>
  );
}
