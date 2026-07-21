"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { createPropertyAction } from "@/actions/properties.actions";
import { initialPropertyActionState } from "@/actions/property.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getNigeriaLgaOptions,
  getNigeriaStateOptions,
} from "@/lib/nigeria-state-lga";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveLandlordPropertyOffline } from "@/lib/offline/operational-mutations.client";

const propertyTypeOptions = [
  {
    label: "Residential",
    value: "residential",
  },
  {
    label: "Mixed-use",
    value: "mixed_use",
  },
  {
    label: "Flat complex",
    value: "flat_complex",
  },
];

export function PropertyForm() {
  const [selectedState, setSelectedState] = useState("");
  const offlineCapableAction = useCallback(
    (previousState: typeof initialPropertyActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: createPropertyAction,
        saveOffline: saveLandlordPropertyOffline,
      }),
    [],
  );
  const [state, formAction, isPending] = useActionState(
    offlineCapableAction,
    initialPropertyActionState,
  );

  const lgaOptions = useMemo(
    () => getNigeriaLgaOptions(selectedState),
    [selectedState],
  );

  const stateOptions = useMemo(() => getNigeriaStateOptions(), []);

  return (
    <form action={formAction}>
      <Card className="border border-border-soft shadow-card">
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
            label="Property name"
            name="propertyName"
            placeholder="Example: Adebayo Court"
            error={state.fieldErrors?.propertyName?.[0]}
            required
          />

          <Input
            label="Address"
            name="address"
            placeholder="Enter the full property address"
            error={state.fieldErrors?.address?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="State"
              name="state"
              placeholder="Select state"
              options={stateOptions}
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value)}
              error={state.fieldErrors?.state?.[0]}
              required
            />

            <Select
              label="LGA"
              name="lga"
              placeholder={selectedState ? "Select LGA" : "Select state first"}
              options={lgaOptions}
              disabled={!selectedState}
              error={state.fieldErrors?.lga?.[0]}
              required
            />
          </div>

          <Select
            label="Property type"
            name="propertyType"
            options={propertyTypeOptions}
            error={state.fieldErrors?.propertyType?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} size="lg" fullWidth>
            Save property and continue
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
