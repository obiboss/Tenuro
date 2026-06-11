"use client";

import { useActionState, useEffect, useState } from "react";
import { createDeveloperPlotAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { DeveloperMoneyInput } from "@/components/developer/developer-money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DeveloperPlotTypeRow } from "@/server/repositories/developer-plots.repository";

type DeveloperPlotFormProps = {
  estateId: string;
  plotTypes: DeveloperPlotTypeRow[];
  embedded?: boolean;
  onSuccess?: () => void;
};

export function DeveloperPlotForm({
  estateId,
  plotTypes,
  embedded = false,
  onSuccess,
}: DeveloperPlotFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDeveloperPlotAction,
    initialDeveloperPlotActionState,
  );
  const [priceDisplay, setPriceDisplay] = useState("");

  useEffect(() => {
    if (state.ok) {
      onSuccess?.();
    }
  }, [onSuccess, state.ok]);

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

      <Input
        label="Plot number"
        name="plotNumber"
        placeholder="Example: A12"
        error={state.fieldErrors?.plotNumber?.[0]}
        required
      />

      <div className="space-y-2">
        <label
          htmlFor="plotTypeId"
          className="block text-sm font-semibold text-text-strong"
        >
          Kind of plot
        </label>

        <select
          id="plotTypeId"
          name="plotTypeId"
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          defaultValue=""
        >
          <option value="">Choose if applicable</option>
          {plotTypes.map((plotType) => (
            <option key={plotType.id} value={plotType.id}>
              {plotType.type_name} — {plotType.size_label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Plot size"
        name="sizeLabel"
        placeholder="Example: 500 sqm"
        error={state.fieldErrors?.sizeLabel?.[0]}
        required
      />

      <DeveloperMoneyInput
        label="Selling price"
        value={priceDisplay}
        onChange={setPriceDisplay}
        hiddenInputName="price"
        required
        error={state.fieldErrors?.price?.[0]}
      />

      <div className="space-y-2">
        <label
          htmlFor="status"
          className="block text-sm font-semibold text-text-strong"
        >
          Can this plot be sold now?{" "}
          <span className="ml-1 text-danger">*</span>
        </label>

        <select
          id="status"
          name="status"
          required
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          defaultValue="available"
        >
          <option value="available">Yes, it is available</option>
          <option value="blocked">No, block this plot for now</option>
        </select>
      </div>

      <Input
        label="Private note"
        name="notes"
        placeholder="Optional"
        error={state.fieldErrors?.notes?.[0]}
      />
    </>
  );

  if (embedded) {
    return (
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="estateId" value={estateId} />
        {fields}
        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending}>
            Add special plot
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
          <Button type="submit" isLoading={isPending}>
            Add Plot
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
