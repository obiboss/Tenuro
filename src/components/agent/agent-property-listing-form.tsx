"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createAgentPropertyListingAction } from "@/actions/agent-property-listings.actions";
import { initialAgentPropertyListingActionState } from "@/actions/agent-property-listings.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

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
  Rivers: ["Obio-Akpor", "Okrika", "Oyigbo", "Port Harcourt"],
};

const stateOptions = Object.keys(stateLgaMap).map((state) => ({
  label: state,
  value: state,
}));

function setFormNumberValue(
  form: HTMLFormElement | null,
  fieldName: string,
  value: number,
) {
  const field = form?.elements.namedItem(fieldName);

  if (!(field instanceof HTMLInputElement)) {
    return;
  }

  field.value = String(value);
}

export function AgentPropertyListingForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [selectedState, setSelectedState] = useState("");

  const [state, formAction, isPending] = useActionState(
    createAgentPropertyListingAction,
    initialAgentPropertyListingActionState,
  );

  const lgaOptions = useMemo(() => {
    return (stateLgaMap[selectedState] ?? []).map((lga) => ({
      label: lga,
      value: lga,
    }));
  }, [selectedState]);

  function handleUnitTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const defaults = unitTypeDefaults[event.target.value];

    if (!defaults) {
      return;
    }

    setFormNumberValue(formRef.current, "bedrooms", defaults.bedrooms);
    setFormNumberValue(formRef.current, "bathrooms", defaults.bathrooms);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Listing submitted"
        errorTitle="Listing could not be submitted"
      />

      <TrustNotice
        title="Landlord verification comes next"
        description="This listing is saved under your agent account first. It will only become a landlord property after landlord verification in the next workflow."
      />

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

      <div className="rounded-card border border-border-soft bg-background p-4">
        <p className="font-extrabold text-text-strong">Landlord details</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Landlord full name"
            name="landlordFullName"
            placeholder="Enter landlord name"
            error={state.fieldErrors?.landlordFullName?.[0]}
            required
          />

          <Input
            label="Landlord phone number"
            name="landlordPhoneNumber"
            placeholder="080..."
            error={state.fieldErrors?.landlordPhoneNumber?.[0]}
            required
          />
        </div>

        <div className="mt-4">
          <Input
            label="Landlord email"
            name="landlordEmail"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.landlordEmail?.[0]}
          />
        </div>
      </div>

      <div className="rounded-card border border-border-soft bg-background p-4">
        <p className="font-extrabold text-text-strong">Property details</p>

        <div className="mt-4 space-y-4">
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
        </div>
      </div>

      <div className="rounded-card border border-border-soft bg-background p-4">
        <p className="font-extrabold text-text-strong">First unit details</p>

        <div className="mt-4 space-y-4">
          <Input
            label="Building or block"
            name="buildingName"
            placeholder="Example: Block A, Back Building"
            error={state.fieldErrors?.buildingName?.[0]}
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
            onChange={handleUnitTypeChange}
            error={state.fieldErrors?.unitType?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              defaultValue={0}
              error={state.fieldErrors?.bedrooms?.[0]}
              helperText="Auto-filled from unit type. You can adjust it."
            />

            <Input
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              defaultValue={0}
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
        </div>
      </div>

      <Textarea
        label="Internal notes"
        name="notes"
        placeholder="Optional note about the property, landlord, or inspection"
        error={state.fieldErrors?.notes?.[0]}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Submit Property Listing
      </Button>
    </form>
  );
}
