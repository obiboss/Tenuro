"use client";

import { useActionState } from "react";
import { assignDeveloperBuyerToPlotAction } from "@/actions/developer-buyers.actions";
import { initialDeveloperBuyerActionState } from "@/actions/developer-buyers.state";
import type { DeveloperBuyerRow } from "@/server/repositories/developer-buyers.repository";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";
import { formatNaira } from "@/server/utils/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type DeveloperPlotAssignmentFormProps = {
  estateId: string;
  buyers: DeveloperBuyerRow[];
  plots: DeveloperPlotRow[];
};

export function DeveloperPlotAssignmentForm({
  estateId,
  buyers,
  plots,
}: DeveloperPlotAssignmentFormProps) {
  const [state, formAction, isPending] = useActionState(
    assignDeveloperBuyerToPlotAction,
    initialDeveloperBuyerActionState,
  );

  const canAssign = buyers.length > 0 && plots.length > 0;

  return (
    <form action={formAction}>
      <input type="hidden" name="estateId" value={estateId} />

      <Card>
        <CardContent>
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

          <div className="space-y-2">
            <label
              htmlFor="buyerId"
              className="block text-sm font-semibold text-text-strong"
            >
              Buyer <span className="ml-1 text-danger">*</span>
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
                {buyers.length > 0 ? "Select buyer" : "No assignable buyers"}
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
              Available plot <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="plotId"
              name="plotId"
              required
              disabled={plots.length === 0}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
              defaultValue=""
            >
              <option value="">
                {plots.length > 0 ? "Select plot" : "No available plots"}
              </option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  Plot {plot.plot_number} — {plot.size_label} —{" "}
                  {formatNaira(Number(plot.price))}
                </option>
              ))}
            </select>

            {state.fieldErrors?.plotId?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.plotId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="assignmentNote"
              className="block text-sm font-semibold text-text-strong"
            >
              Assignment note
            </label>

            <textarea
              id="assignmentNote"
              name="assignmentNote"
              rows={3}
              placeholder="Optional note"
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
              Create at least one prospective buyer and one available plot
              before assigning a buyer.
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} disabled={!canAssign}>
            Assign Buyer to Plot
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
