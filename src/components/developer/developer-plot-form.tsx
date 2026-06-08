"use client";

import { useActionState } from "react";
import { createDeveloperPlotAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import type { DeveloperPlotTypeRow } from "@/server/repositories/developer-plots.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperPlotFormProps = {
  estateId: string;
  plotTypes: DeveloperPlotTypeRow[];
};

export function DeveloperPlotForm({
  estateId,
  plotTypes,
}: DeveloperPlotFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDeveloperPlotAction,
    initialDeveloperPlotActionState,
  );

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

          <Input
            label="Plot number"
            name="plotNumber"
            placeholder="A12"
            error={state.fieldErrors?.plotNumber?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="plotTypeId"
              className="block text-sm font-semibold text-text-strong"
            >
              Plot type
            </label>

            <select
              id="plotTypeId"
              name="plotTypeId"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue=""
            >
              <option value="">No plot type</option>
              {plotTypes.map((plotType) => (
                <option key={plotType.id} value={plotType.id}>
                  {plotType.type_name} — {plotType.size_label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Size"
            name="sizeLabel"
            placeholder="500 sqm"
            error={state.fieldErrors?.sizeLabel?.[0]}
            required
          />

          <Input
            label="Price"
            name="price"
            type="number"
            min="1"
            step="0.01"
            placeholder="5000000"
            error={state.fieldErrors?.price?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-semibold text-text-strong"
            >
              Status <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="status"
              name="status"
              required
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue="available"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <Input
            label="Notes"
            name="notes"
            placeholder="Optional"
            error={state.fieldErrors?.notes?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Add Plot
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
