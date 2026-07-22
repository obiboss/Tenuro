"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";
import { createManagerUnitAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveManagerUnitOffline } from "@/lib/offline/operational-mutations.client";
import { RENT_PAYMENT_FREQUENCY_LABELS, RENT_PAYMENT_FREQUENCIES } from "@/lib/rent-cycle";
import type { ManagerPropertyRow } from "@/server/repositories/manager.repository";

type ManagerUnitFormProps = {
  properties: ManagerPropertyRow[];
  lockedPropertyId?: string;
};

const UNIT_TYPE_OPTIONS = [
  "Room",
  "Self-contained",
  "Mini flat",
  "1-bedroom flat",
  "2-bedroom flat",
  "3-bedroom flat",
  "4-bedroom flat",
  "Duplex",
  "Detached house",
  "Semi-detached house",
  "Bungalow",
  "Shop",
  "Office",
  "Warehouse",
  "Store",
  "Hall",
  "Short-let apartment",
] as const;

function buildToastId(params: { ok: boolean; message: string; id?: string }) {
  return `${params.ok ? "success" : "error"}-${params.id ?? "unit"}-${params.message}`;
}

export function ManagerUnitForm({
  properties,
  lockedPropertyId,
}: ManagerUnitFormProps) {
  const initialPropertyId = lockedPropertyId ?? properties[0]?.id ?? "";

  const [selectedPropertyId, setSelectedPropertyId] =
    useState(initialPropertyId);
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);

  const offlineCapableAction = useCallback(
    (previousState: typeof initialManagerActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: createManagerUnitAction,
        saveOffline: saveManagerUnitOffline,
      }),
    [],
  );
  const [state, formAction, isPending] = useActionState(
    offlineCapableAction,
    initialManagerActionState,
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId],
  );

  const propertyHref = selectedPropertyId
    ? `/manager/properties/${selectedPropertyId}#units`
    : "/manager/properties";

  const formKey = state.ok
    ? `unit-form-${state.submissionId ?? state.unitId ?? state.message}`
    : "unit-form-active";

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = buildToastId({
      ok: state.ok,
      message: state.message,
      id: state.submissionId ?? state.unitId,
    });

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok ? "Unit added" : "Could not add unit",
      description: state.message,
    };
  }, [
    dismissedToastId,
    state.message,
    state.ok,
    state.submissionId,
    state.unitId,
  ]);

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add unit
          </h2>
          <p className="rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
            Add a property first before creating units.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast toast={toast} onDismiss={setDismissedToastId} />
        </div>
      ) : null}

      <form action={formAction} key={formKey}>
        <input
          type="hidden"
          name="landlordClientId"
          value={selectedProperty?.landlord_client_id ?? ""}
        />

        <Card>
          <CardContent>
            <div>
              <h2 className="text-lg font-black tracking-tight text-text-strong">
                Add unit
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Add one flat, shop, room, or office at a time.
              </p>
            </div>

            {state.ok ? (
              <div className="rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                Unit added. Add another unit below or view all units.
              </div>
            ) : null}

            {lockedPropertyId ? (
              <input type="hidden" name="propertyId" value={lockedPropertyId} />
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="manager-unit-property"
                  className="text-sm font-bold text-text-strong"
                >
                  Property
                </label>
                <select
                  id="manager-unit-property"
                  name="propertyId"
                  value={selectedPropertyId}
                  onChange={(event) =>
                    setSelectedPropertyId(event.target.value)
                  }
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.property_name}
                    </option>
                  ))}
                </select>
                {state.fieldErrors?.propertyId?.[0] ? (
                  <p className="text-sm font-semibold text-danger">
                    {state.fieldErrors.propertyId[0]}
                  </p>
                ) : null}
              </div>
            )}

            {state.fieldErrors?.landlordClientId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.landlordClientId[0]}
              </p>
            ) : null}

            <Input
              label="Unit name"
              name="unitLabel"
              placeholder="Example: Flat 2A"
              error={state.ok ? undefined : state.fieldErrors?.unitLabel?.[0]}
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="manager-unit-type"
                className="text-sm font-bold text-text-strong"
              >
                Unit type
              </label>
              <select
                id="manager-unit-type"
                name="unitType"
                defaultValue=""
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              >
                <option value="">Select unit type</option>
                {UNIT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {state.ok ? null : state.fieldErrors?.unitType?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.unitType[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="manager-unit-rent-frequency" className="text-sm font-bold text-text-strong">
                Rent collection frequency
              </label>
              <select
                id="manager-unit-rent-frequency"
                name="rentFrequency"
                defaultValue="annual"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                required
              >
                {RENT_PAYMENT_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {RENT_PAYMENT_FREQUENCY_LABELS[frequency]}
                  </option>
                ))}
              </select>
              {state.ok ? null : state.fieldErrors?.rentFrequency?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.rentFrequency[0]}
                </p>
              ) : null}
            </div>

            <CurrencyInput
              label="Rent amount for this frequency"
              name="rentAmount"
              placeholder="0.00"
              error={state.ok ? undefined : state.fieldErrors?.rentAmount?.[0]}
              helperText="This amount and frequency will be locked during tenant onboarding."
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="manager-unit-notes"
                className="text-sm font-bold text-text-strong"
              >
                Notes
              </label>
              <textarea
                id="manager-unit-notes"
                name="notes"
                rows={3}
                placeholder="Optional"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
              />
              {state.ok ? null : state.fieldErrors?.notes?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.notes[0]}
                </p>
              ) : null}
            </div>
          </CardContent>

          <CardFooter>
            <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto]">
              <Button type="submit" isLoading={isPending} fullWidth>
                Add unit
              </Button>

              <Link
                href={propertyHref}
                prefetch={false}
                className="inline-flex min-h-12 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
              >
                View units
              </Link>
            </div>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
