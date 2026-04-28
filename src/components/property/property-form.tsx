"use client";

import { useActionState, useMemo, useState } from "react";
import { createPropertyAction } from "@/actions/properties.actions";
import { initialPropertyActionState } from "@/actions/property.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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

const stateLgaMap: Record<string, string[]> = {
  Lagos: [
    "Agege",
    "Ajeromi-Ifelodun",
    "Alimosho",
    "Amuwo-Odofin",
    "Apapa",
    "Badagry",
    "Epe",
    "Eti-Osa",
    "Ibeju-Lekki",
    "Ifako-Ijaiye",
    "Ikeja",
    "Ikorodu",
    "Kosofe",
    "Lagos Island",
    "Lagos Mainland",
    "Mushin",
    "Ojo",
    "Oshodi-Isolo",
    "Shomolu",
    "Surulere",
  ],
  Abuja: [
    "Abaji",
    "Bwari",
    "Gwagwalada",
    "Kuje",
    "Kwali",
    "Municipal Area Council",
  ],
  Ogun: [
    "Abeokuta North",
    "Abeokuta South",
    "Ado-Odo/Ota",
    "Ewekoro",
    "Ifo",
    "Ijebu East",
    "Ijebu North",
    "Ijebu Ode",
    "Obafemi Owode",
    "Odeda",
    "Sagamu",
  ],
  Oyo: [
    "Akinyele",
    "Egbeda",
    "Ibadan North",
    "Ibadan North-East",
    "Ibadan North-West",
    "Ibadan South-East",
    "Ibadan South-West",
    "Lagelu",
    "Oluyole",
    "Ona Ara",
  ],
  Rivers: ["Obio-Akpor", "Okrika", "Okrika", "Oyigbo", "Port Harcourt"],
};

const stateOptions = Object.keys(stateLgaMap).map((state) => ({
  label: state,
  value: state,
}));

export function PropertyForm() {
  const [selectedState, setSelectedState] = useState("");
  const [state, formAction, isPending] = useActionState(
    createPropertyAction,
    initialPropertyActionState,
  );

  const lgaOptions = useMemo(() => {
    return (stateLgaMap[selectedState] ?? []).map((lga) => ({
      label: lga,
      value: lga,
    }));
  }, [selectedState]);

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
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
          <Button type="submit" isLoading={isPending}>
            Save Property
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
