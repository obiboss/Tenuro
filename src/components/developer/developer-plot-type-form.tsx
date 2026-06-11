"use client";

import { useActionState, useEffect, useState } from "react";
import { createDeveloperPlotTypeAction } from "@/actions/developer-plots.actions";
import { initialDeveloperPlotActionState } from "@/actions/developer-plots.state";
import { DeveloperMoneyInput } from "@/components/developer/developer-money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperPlotTypeFormProps = {
  estateId: string;
  embedded?: boolean;
  onSuccess?: () => void;
};

export function DeveloperPlotTypeForm({
  estateId,
  embedded = false,
  onSuccess,
}: DeveloperPlotTypeFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDeveloperPlotTypeAction,
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
        label="What should this kind of plot be called?"
        name="typeName"
        placeholder="Example: Standard Plot"
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

      <DeveloperMoneyInput
        label="Usual selling price"
        value={priceDisplay}
        onChange={setPriceDisplay}
        hiddenInputName="defaultPrice"
        required
        error={state.fieldErrors?.defaultPrice?.[0]}
      />

      <Input
        label="Short note"
        name="description"
        placeholder="Optional"
        error={state.fieldErrors?.description?.[0]}
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
            Save plot kind
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
            Save Plot Kind
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
