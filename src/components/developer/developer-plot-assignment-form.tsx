"use client";

import { useActionState, useEffect } from "react";
import { assignDeveloperBuyerToPlotAction } from "@/actions/developer-buyers.actions";
import { initialDeveloperBuyerActionState } from "@/actions/developer-buyers.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatNairaCompact } from "@/lib/money/naira";
import type { DeveloperBuyerRow } from "@/server/repositories/developer-buyers.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotAssignmentFormProps = {
  estateId: string;
  buyers: DeveloperBuyerRow[];
  plots: DeveloperPlotRow[];
  preselectedPlotId?: string;
  embedded?: boolean;
  onSuccess?: () => void;
};

export function DeveloperPlotAssignmentForm({
  estateId,
  buyers,
  plots,
  preselectedPlotId = "",
  embedded = false,
  onSuccess,
}: DeveloperPlotAssignmentFormProps) {
  const [state, formAction, isPending] = useActionState(
    assignDeveloperBuyerToPlotAction,
    initialDeveloperBuyerActionState,
  );

  useEffect(() => {
    if (state.ok) {
      onSuccess?.();
    }
  }, [onSuccess, state.ok]);

  const canAssign = buyers.length > 0 && plots.length > 0;

  const fields = (
    <>
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

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="buyerId"
            className="block text-sm font-semibold text-text-strong"
          >
            Choose buyer <span className="ml-1 text-danger">*</span>
          </label>

          <select
            id="buyerId"
            name="buyerId"
            required
            disabled={buyers.length === 0}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
            defaultValue=""
          >
            <option value="">
              {buyers.length > 0 ? "Choose buyer" : "No buyer is ready yet"}
            </option>

            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.full_name} — {buyer.phone_number}
              </option>
            ))}
          </select>

          {state.fieldErrors?.buyerId?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.buyerId[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="plotId"
            className="block text-sm font-semibold text-text-strong"
          >
            Choose available plot <span className="ml-1 text-danger">*</span>
          </label>

          <select
            id="plotId"
            name="plotId"
            required
            disabled={plots.length === 0}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
            defaultValue={preselectedPlotId}
          >
            <option value="">
              {plots.length > 0
                ? "Choose available plot"
                : "No available plot yet"}
            </option>

            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.plot_number} — {plot.size_label} —{" "}
                {formatNairaCompact(Number(plot.price))}
              </option>
            ))}
          </select>

          {state.fieldErrors?.plotId?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.plotId[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="assignmentNote"
          className="block text-sm font-semibold text-text-strong"
        >
          Note
        </label>

        <textarea
          id="assignmentNote"
          name="assignmentNote"
          rows={3}
          placeholder="Optional"
          className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />

        {state.fieldErrors?.assignmentNote?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.assignmentNote[0]}
          </p>
        ) : null}
      </div>

      {!canAssign ? (
        <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
          Add at least one buyer and one available plot before giving a plot to a
          buyer.
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="estateId" value={estateId} />
        {fields}
        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending} disabled={!canAssign}>
            Give plot to buyer
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="estateId" value={estateId} />
      <Card>
        <CardContent>{fields}</CardContent>
        <CardFooter>
          <Button type="submit" isLoading={isPending} disabled={!canAssign}>
            Give Plot to Buyer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
