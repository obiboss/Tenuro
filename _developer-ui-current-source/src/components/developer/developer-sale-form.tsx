"use client";

import { useActionState } from "react";
import { createDeveloperSaleAction } from "@/actions/developer-sales.actions";
import { initialDeveloperSaleActionState } from "@/actions/developer-sales.state";
import type { DeveloperPlotAssignmentWithDetails } from "@/server/repositories/developer-plot-assignments.repository";
import { formatNaira } from "@/server/utils/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperSaleFormProps = {
  assignments: DeveloperPlotAssignmentWithDetails[];
};

const paymentPlanModeOptions = [
  { value: "outright", label: "Outright payment" },
  { value: "fixed_installment", label: "Fixed installment" },
  { value: "milestone_based", label: "Milestone-based" },
  { value: "flexible", label: "Flexible" },
] as const;

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function DeveloperSaleForm({ assignments }: DeveloperSaleFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDeveloperSaleAction,
    initialDeveloperSaleActionState,
  );

  const canCreateSale = assignments.length > 0;

  return (
    <form action={formAction}>
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
              htmlFor="plotAssignmentId"
              className="block text-sm font-semibold text-text-strong"
            >
              Reserved buyer / plot <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="plotAssignmentId"
              name="plotAssignmentId"
              required
              disabled={!canCreateSale}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
              defaultValue=""
            >
              <option value="">
                {canCreateSale
                  ? "Select reserved assignment"
                  : "No reserved assignments"}
              </option>

              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.developer_buyers?.full_name ?? "Buyer"} — Plot{" "}
                  {assignment.developer_plots?.plot_number ?? "Plot"} —{" "}
                  {formatNaira(Number(assignment.developer_plots?.price ?? 0))}
                </option>
              ))}
            </select>

            {state.fieldErrors?.plotAssignmentId?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.plotAssignmentId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="paymentPlanMode"
              className="block text-sm font-semibold text-text-strong"
            >
              Payment mode <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="paymentPlanMode"
              name="paymentPlanMode"
              required
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue="outright"
            >
              {paymentPlanModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {state.fieldErrors?.paymentPlanMode?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.paymentPlanMode[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Locked sale price"
            name="totalPriceLocked"
            type="number"
            min="1"
            step="0.01"
            placeholder="5000000"
            error={state.fieldErrors?.totalPriceLocked?.[0]}
            required
          />

          <Input
            label="Initial deposit amount"
            name="initialDepositAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            error={state.fieldErrors?.initialDepositAmount?.[0]}
          />

          <Input
            label="Sale date"
            name="saleDate"
            type="date"
            defaultValue={getTodayDateInputValue()}
            error={state.fieldErrors?.saleDate?.[0]}
            required
          />

          <Input
            label="Expected completion date"
            name="expectedCompletionDate"
            type="date"
            error={state.fieldErrors?.expectedCompletionDate?.[0]}
          />

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-semibold text-text-strong"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Optional sale note"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />

            {state.fieldErrors?.notes?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.notes[0]}
              </p>
            ) : null}
          </div>

          {!canCreateSale ? (
            <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
              Assign a buyer to a plot first. Only reserved buyer/plot
              assignments can be converted to sales.
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} disabled={!canCreateSale}>
            Create Sale
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
