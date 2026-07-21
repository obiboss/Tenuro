"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createUnitAction } from "@/actions/units.actions";
import { initialUnitActionState } from "@/actions/unit.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveLandlordUnitOffline } from "@/lib/offline/operational-mutations.client";

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
  layout?: "card" | "embedded";
  onSuccess?: () => void;
  onCancel?: () => void;
};

const defaultUnitType = "single_room";

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

function SectionHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-black text-primary">
        {step}
      </span>

      <div>
        <h3 className="font-black text-text-strong">{title}</h3>
        <p className="mt-0.5 text-sm font-semibold leading-5 text-text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

export function UnitForm({
  propertyId,
  layout = "card",
  onSuccess,
  onCancel,
}: UnitFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const handledSuccessMessageRef = useRef<string | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const createAction = useMemo(
    () => createUnitAction.bind(null, propertyId),
    [propertyId],
  );
  const offlineCapableAction = useCallback(
    (previousState: typeof initialUnitActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: createAction,
        saveOffline: (data) => saveLandlordUnitOffline(propertyId, data),
      }),
    [createAction, propertyId],
  );

  const [state, formAction, isPending] = useActionState(
    offlineCapableAction,
    initialUnitActionState,
  );

  useEffect(() => {
    if (!state.ok || !state.message) {
      return;
    }

    if (handledSuccessMessageRef.current === state.message) {
      return;
    }

    handledSuccessMessageRef.current = state.message;
    formRef.current?.reset();
    setFormResetKey((currentKey) => currentKey + 1);
    setFormNumberValue(
      formRef.current,
      "bedrooms",
      unitTypeDefaults[defaultUnitType].bedrooms,
    );
    setFormNumberValue(
      formRef.current,
      "bathrooms",
      unitTypeDefaults[defaultUnitType].bathrooms,
    );

    // Do not refresh a protected server-rendered page after a local-only save.
    // The refresh cannot authenticate while offline and can appear to log the
    // landlord out even though the unit was queued successfully.
    if (!state.offlineSaved) {
      onSuccess?.();
    }
  }, [onSuccess, state.message, state.offlineSaved, state.ok]);

  function handleUnitTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const defaults = unitTypeDefaults[event.target.value];

    if (!defaults) {
      return;
    }

    setFormNumberValue(formRef.current, "bedrooms", defaults.bedrooms);
    setFormNumberValue(formRef.current, "bathrooms", defaults.bathrooms);
  }

  const formFields = (
    <div className="space-y-7">
      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <section className="space-y-4" aria-labelledby="unit-details-heading">
        <SectionHeading
          step={1}
          title="Unit details"
          description="Name the rentable space and choose the closest unit type."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Unit name"
            name="unitIdentifier"
            placeholder="Example: Flat 3 or Shop 1"
            error={state.fieldErrors?.unitIdentifier?.[0]}
            key={`unit-identifier-${formResetKey}`}
            required
          />

          <Select
            label="Unit type"
            name="unitType"
            options={unitTypeOptions}
            defaultValue={defaultUnitType}
            key={`unit-type-${formResetKey}`}
            onChange={handleUnitTypeChange}
            error={state.fieldErrors?.unitType?.[0]}
            required
          />
        </div>

        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              defaultValue={unitTypeDefaults[defaultUnitType].bedrooms}
              key={`bedrooms-${formResetKey}`}
              error={state.fieldErrors?.bedrooms?.[0]}
            />

            <Input
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              defaultValue={unitTypeDefaults[defaultUnitType].bathrooms}
              key={`bathrooms-${formResetKey}`}
              error={state.fieldErrors?.bathrooms?.[0]}
            />
          </div>

          <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
            These values follow the selected unit type. Adjust them only when
            needed.
          </p>
        </div>
      </section>

      <div className="h-px bg-border-soft" />

      <section className="space-y-4" aria-labelledby="unit-rent-heading">
        <SectionHeading
          step={2}
          title="Rent"
          description="Enter the amount this tenant will normally pay."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CurrencyInput
            label="Annual rent"
            name="annualRent"
            placeholder="0.00"
            resetKey={formResetKey}
            error={state.fieldErrors?.annualRent?.[0]}
            helperText="Use this for yearly rent."
          />

          <CurrencyInput
            label="Monthly rent"
            name="monthlyRent"
            placeholder="0.00"
            resetKey={formResetKey}
            error={state.fieldErrors?.monthlyRent?.[0]}
            helperText="Optional. Use only for monthly rent."
          />
        </div>
      </section>

      <div className="h-px bg-border-soft" />

      <section className="space-y-4" aria-labelledby="unit-location-heading">
        <SectionHeading
          step={3}
          title="Location within the property"
          description="Add this only when the property has multiple buildings or blocks."
        />

        <Input
          label="Building or block"
          name="buildingName"
          placeholder="Example: Block A or Back Building"
          key={`building-${formResetKey}`}
        />
      </section>
    </div>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className={layout === "embedded" ? "min-h-full" : undefined}
    >
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Unit saved"
        errorTitle="Unit could not be saved"
      />

      {layout === "embedded" ? (
        <>
          <div className="px-5 py-5 sm:px-6 sm:py-6">{formFields}</div>

          <div className="sticky bottom-0 z-10 border-t border-border-soft bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(7rem,auto)_minmax(9rem,auto)] sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isPending}
                fullWidth
              >
                Cancel
              </Button>

              <Button type="submit" isLoading={isPending} fullWidth>
                Add unit
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent>{formFields}</CardContent>

          <CardFooter>
            <Button type="submit" isLoading={isPending}>
              Add unit
            </Button>
          </CardFooter>
        </Card>
      )}
    </form>
  );
}
