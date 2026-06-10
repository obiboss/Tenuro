"use client";

import { useActionState, useState } from "react";
import { createBulkDeveloperPlotsAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperBulkPlotFormProps = {
  estateId: string;
};

function formatNairaInput(value: string) {
  const numericValue = value.replace(/[^\d]/g, "");

  if (!numericValue) {
    return "";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(numericValue));
}

function getNumericMoneyValue(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function DeveloperBulkPlotForm({
  estateId,
}: DeveloperBulkPlotFormProps) {
  const [state, formAction, isPending] = useActionState(
    createBulkDeveloperPlotsAction,
    initialDeveloperPlotActionState,
  );

  const [priceDisplay, setPriceDisplay] = useState("");

  return (
    <form action={formAction}>
      <input type="hidden" name="estateId" value={estateId} />
      <input
        type="hidden"
        name="pricePerPlot"
        value={getNumericMoneyValue(priceDisplay)}
      />

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

          <div className="rounded-button bg-primary-soft p-4 text-sm font-semibold leading-6 text-primary">
            Enter the estate land details once. BOPA will number the plots and
            create the plot list for you.
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="How large is the land?"
              name="landSize"
              placeholder="Example: 100 acres or 40 hectares"
              error={state.fieldErrors?.landSize?.[0]}
              required
            />

            <Input
              label="How many plots should BOPA create?"
              name="numberOfPlots"
              type="number"
              min="1"
              max="500"
              step="1"
              placeholder="Example: 200"
              error={state.fieldErrors?.numberOfPlots?.[0]}
              required
            />

            <Input
              label="What is the size of each plot?"
              name="plotSizeLabel"
              placeholder="Example: 500 sqm"
              error={state.fieldErrors?.plotSizeLabel?.[0]}
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="priceDisplay"
                className="block text-sm font-semibold text-text-strong"
              >
                Selling price per plot{" "}
                <span className="ml-1 text-danger">*</span>
              </label>

              <input
                id="priceDisplay"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={(event) =>
                  setPriceDisplay(formatNairaInput(event.target.value))
                }
                placeholder="Example: ₦5,000,000"
                required
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />

              {state.fieldErrors?.pricePerPlot?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.pricePerPlot[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="numberingStyle"
                className="block text-sm font-semibold text-text-strong"
              >
                How should BOPA number the plots?
              </label>

              <select
                id="numberingStyle"
                name="numberingStyle"
                defaultValue="prefixed_numeric"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              >
                <option value="numeric">Plot 1, Plot 2, Plot 3</option>
                <option value="prefixed_numeric">A1, A2, A3</option>
                <option value="block_numeric">
                  Block A - Plot 1, Block A - Plot 2
                </option>
              </select>

              {state.fieldErrors?.numberingStyle?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.numberingStyle[0]}
                </p>
              ) : null}
            </div>

            <Input
              label="Starting number"
              name="startingNumber"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              error={state.fieldErrors?.startingNumber?.[0]}
              required
            />

            <Input
              label="Prefix, if needed"
              name="labelPrefix"
              placeholder="Example: A"
              error={state.fieldErrors?.labelPrefix?.[0]}
            />

            <Input
              label="Plots per block"
              name="plotsPerBlock"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue="20"
              error={state.fieldErrors?.plotsPerBlock?.[0]}
              required
            />
          </div>

          <Input
            label="Private note"
            name="note"
            placeholder="Optional"
            error={state.fieldErrors?.note?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Generate Plots
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
