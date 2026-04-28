"use client";

import { useActionState, useEffect, useState } from "react";
import { createUnitAction } from "@/actions/units.actions";
import { initialUnitActionState } from "@/actions/unit.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const unitTypeOptions = [
  { label: "Single Room", value: "single_room" },
  { label: "Self Contain", value: "self_contain" },
  { label: "Room and Parlour", value: "room_and_parlour" },
  { label: "Mini Flat", value: "mini_flat" },
  { label: "2 Bedroom Flat", value: "two_bedroom_flat" },
  { label: "3 Bedroom Flat", value: "three_bedroom_flat" },
  { label: "Duplex", value: "duplex" },
  { label: "Shop", value: "shop" },
  { label: "Office Space", value: "office_space" },
  { label: "Other", value: "other" },
];

const unitTypeDefaults: Record<
  string,
  {
    bedrooms: number;
    bathrooms: number;
  }
> = {
  single_room: {
    bedrooms: 1,
    bathrooms: 0,
  },
  self_contain: {
    bedrooms: 1,
    bathrooms: 1,
  },
  room_and_parlour: {
    bedrooms: 1,
    bathrooms: 1,
  },
  mini_flat: {
    bedrooms: 1,
    bathrooms: 1,
  },
  two_bedroom_flat: {
    bedrooms: 2,
    bathrooms: 2,
  },
  three_bedroom_flat: {
    bedrooms: 3,
    bathrooms: 3,
  },
  duplex: {
    bedrooms: 4,
    bathrooms: 4,
  },
  shop: {
    bedrooms: 0,
    bathrooms: 0,
  },
  office_space: {
    bedrooms: 0,
    bathrooms: 1,
  },
  other: {
    bedrooms: 0,
    bathrooms: 0,
  },
};

type UnitFormProps = {
  propertyId: string;
};

export function UnitForm({ propertyId }: UnitFormProps) {
  const createAction = createUnitAction.bind(null, propertyId);

  const [unitType, setUnitType] = useState("");
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);

  const [state, formAction, isPending] = useActionState(
    createAction,
    initialUnitActionState,
  );

  useEffect(() => {
    if (!unitType) {
      return;
    }

    const defaults = unitTypeDefaults[unitType];

    if (!defaults) {
      return;
    }

    setBedrooms(defaults.bedrooms);
    setBathrooms(defaults.bathrooms);
  }, [unitType]);

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

          <Input
            label="Building or block"
            name="buildingName"
            placeholder="Example: Block A, Back Building, Landlord House"
            helperText="Use this if the property has more than one building or block."
          />

          <Input
            label="Unit name"
            name="unitIdentifier"
            placeholder="Example: Flat 3, Room 2A, Shop 1"
            error={state.fieldErrors?.unitIdentifier?.[0]}
            required
          />

          <Select
            label="Unit type"
            name="unitType"
            options={unitTypeOptions}
            value={unitType}
            onChange={(event) => setUnitType(event.target.value)}
            error={state.fieldErrors?.unitType?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              value={bedrooms}
              onChange={(event) => setBedrooms(Number(event.target.value))}
              error={state.fieldErrors?.bedrooms?.[0]}
              helperText="Auto-filled from unit type. You can adjust it."
            />

            <Input
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              value={bathrooms}
              onChange={(event) => setBathrooms(Number(event.target.value))}
              error={state.fieldErrors?.bathrooms?.[0]}
              helperText="Auto-filled from unit type. You can adjust it."
            />
          </div>

          <CurrencyInput
            label="Annual rent"
            name="annualRent"
            placeholder="0.00"
            error={state.fieldErrors?.annualRent?.[0]}
            helperText="Most Nigerian landlords collect rent yearly, so this is the main rent amount."
          />

          <CurrencyInput
            label="Monthly rent"
            name="monthlyRent"
            placeholder="0.00"
            error={state.fieldErrors?.monthlyRent?.[0]}
            helperText="Use only if this unit is rented monthly."
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Save Unit
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
