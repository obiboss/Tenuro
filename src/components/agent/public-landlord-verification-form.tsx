"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { verifyLandlordPropertyListingAction } from "@/actions/agent-property-listings.actions";
import { initialPublicLandlordVerificationActionState } from "@/actions/agent-property-listings.state";
import type { AgentPropertyListingRow } from "@/server/repositories/agent-property-listings.repository";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PublicLandlordVerificationFormProps = {
  token: string;
  listing: AgentPropertyListingRow;
};

const propertyTypeOptions = [
  { label: "Residential", value: "residential" },
  { label: "Mixed-use", value: "mixed_use" },
  { label: "Flat complex", value: "flat_complex" },
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

export function PublicLandlordVerificationForm({
  token,
  listing,
}: PublicLandlordVerificationFormProps) {
  const [selectedState, setSelectedState] = useState(listing.state);

  const [state, formAction, isPending] = useActionState(
    verifyLandlordPropertyListingAction,
    initialPublicLandlordVerificationActionState,
  );

  const lgaOptions = useMemo(() => {
    return (stateLgaMap[selectedState] ?? []).map((lga) => ({
      label: lga,
      value: lga,
    }));
  }, [selectedState]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success"
              : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
          }
        >
          {state.message}
        </div>
      ) : null}

      {state.ok ? (
        <div className="space-y-4">
          <Link href="/register">
            <Button type="button" fullWidth>
              Create Landlord Account
            </Button>
          </Link>

          <p className="text-center text-sm leading-6 text-text-muted">
            After signup, you will be able to add more units, approve tenants,
            generate agreements, and track rent payments.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-card border border-border-soft bg-background p-4">
            <p className="font-extrabold text-text-strong">
              Review landlord details
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Landlord full name"
                name="landlordFullName"
                defaultValue={listing.landlord_full_name}
                error={state.fieldErrors?.landlordFullName?.[0]}
                required
              />

              <Input
                label="Landlord phone number"
                name="landlordPhoneNumber"
                defaultValue={listing.landlord_phone_number}
                error={state.fieldErrors?.landlordPhoneNumber?.[0]}
                required
              />
            </div>

            <div className="mt-4">
              <Input
                label="Landlord email"
                name="landlordEmail"
                type="email"
                defaultValue={listing.landlord_email ?? ""}
                error={state.fieldErrors?.landlordEmail?.[0]}
              />
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-background p-4">
            <p className="font-extrabold text-text-strong">
              Review property details
            </p>

            <div className="mt-4 space-y-4">
              <Input
                label="Property name"
                name="propertyName"
                defaultValue={listing.property_name}
                error={state.fieldErrors?.propertyName?.[0]}
                required
              />

              <Input
                label="Address"
                name="address"
                defaultValue={listing.address}
                error={state.fieldErrors?.address?.[0]}
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="State"
                  name="state"
                  options={stateOptions}
                  value={selectedState}
                  onChange={(event) => setSelectedState(event.target.value)}
                  error={state.fieldErrors?.state?.[0]}
                  required
                />

                <Select
                  label="LGA"
                  name="lga"
                  options={lgaOptions}
                  defaultValue={listing.lga}
                  error={state.fieldErrors?.lga?.[0]}
                  required
                />
              </div>

              <Select
                label="Property type"
                name="propertyType"
                options={propertyTypeOptions}
                defaultValue={listing.property_type}
                error={state.fieldErrors?.propertyType?.[0]}
                required
              />
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-background p-4">
            <p className="font-extrabold text-text-strong">Review first unit</p>

            <div className="mt-4 space-y-4">
              <Input
                label="Building or block"
                name="buildingName"
                defaultValue={listing.building_name ?? ""}
                error={state.fieldErrors?.buildingName?.[0]}
              />

              <Input
                label="Unit name"
                name="unitIdentifier"
                defaultValue={listing.unit_identifier}
                error={state.fieldErrors?.unitIdentifier?.[0]}
                required
              />

              <Select
                label="Unit type"
                name="unitType"
                options={unitTypeOptions}
                defaultValue={listing.unit_type}
                error={state.fieldErrors?.unitType?.[0]}
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Bedrooms"
                  name="bedrooms"
                  type="number"
                  min={0}
                  defaultValue={listing.bedrooms}
                  error={state.fieldErrors?.bedrooms?.[0]}
                />

                <Input
                  label="Bathrooms"
                  name="bathrooms"
                  type="number"
                  min={0}
                  defaultValue={listing.bathrooms}
                  error={state.fieldErrors?.bathrooms?.[0]}
                />
              </div>

              <CurrencyInput
                label="Annual rent"
                name="annualRent"
                defaultValue={listing.annual_rent ?? ""}
                error={state.fieldErrors?.annualRent?.[0]}
                helperText="Most Nigerian landlords collect rent yearly, so this is the main rent amount."
              />

              <CurrencyInput
                label="Monthly rent"
                name="monthlyRent"
                defaultValue={listing.monthly_rent ?? ""}
                error={state.fieldErrors?.monthlyRent?.[0]}
                helperText="Use only if this unit is rented monthly."
              />
            </div>
          </div>

          <Textarea
            label="Notes"
            name="notes"
            defaultValue={listing.notes ?? ""}
            error={state.fieldErrors?.notes?.[0]}
          />

          <Button type="submit" isLoading={isPending} fullWidth>
            Approve Final Property Details
          </Button>
        </>
      )}
    </form>
  );
}
