"use client";

import { useActionState } from "react";
import { createDeveloperPlotTypeAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperPlotTypeFormProps = {
  estateId: string;
};

export function DeveloperPlotTypeForm({
  estateId,
}: DeveloperPlotTypeFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDeveloperPlotTypeAction,
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
            label="What should this kind of plot be called?"
            name="typeName"
            placeholder="Example: 500 sqm Residential Plot"
            error={state.fieldErrors?.typeName?.[0]}
            required
          />

          <Input
            label="What is the size?"
            name="sizeLabel"
            placeholder="Example: 500 sqm"
            error={state.fieldErrors?.sizeLabel?.[0]}
            required
          />

          <Input
            label="Usual selling price"
            name="defaultPrice"
            type="number"
            min="1"
            step="0.01"
            placeholder="Example: 5000000"
            error={state.fieldErrors?.defaultPrice?.[0]}
            required
          />

          <Input
            label="Short note"
            name="description"
            placeholder="Optional"
            error={state.fieldErrors?.description?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Save Plot Kind
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
