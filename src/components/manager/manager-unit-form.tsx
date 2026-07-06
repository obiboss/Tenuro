"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import { createManagerUnitAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_CREATABLE_UNIT_STATUSES,
  MANAGER_UNIT_STATUS_LABELS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
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

export function ManagerUnitForm({
  properties,
  lockedPropertyId,
}: ManagerUnitFormProps) {
  const initialPropertyId = lockedPropertyId ?? properties[0]?.id ?? "";

  const [selectedPropertyId, setSelectedPropertyId] =
    useState(initialPropertyId);

  const [unitType, setUnitType] = useState("");

  const [state, formAction, isPending] = useActionState(
    createManagerUnitAction,
    initialManagerActionState,
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId],
  );

  const propertyHref = selectedPropertyId
    ? `/manager/properties/${selectedPropertyId}#units`
    : "/manager/properties";

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
    <form action={formAction}>
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

          {state.message ? (
            <div
              role="alert"
              className={
                state.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              <p>{state.message}</p>

              {state.ok ? (
                <Link
                  href={propertyHref}
                  prefetch={false}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                >
                  View units and add tenant
                </Link>
              ) : null}
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
                onChange={(event) => setSelectedPropertyId(event.target.value)}
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
            error={state.fieldErrors?.unitLabel?.[0]}
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
              value={unitType}
              onChange={(event) => setUnitType(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            >
              <option value="">Select unit type</option>
              {UNIT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {state.fieldErrors?.unitType?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.unitType[0]}
              </p>
            ) : null}
          </div>

          <CurrencyInput
            label="Rent amount"
            name="rentAmount"
            placeholder="0.00"
            error={state.fieldErrors?.rentAmount?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-unit-status"
              className="text-sm font-bold text-text-strong"
            >
              Unit status
            </label>
            <select
              id="manager-unit-status"
              name="status"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue="vacant"
              required
            >
              {MANAGER_CREATABLE_UNIT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MANAGER_UNIT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.status?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.status[0]}
              </p>
            ) : null}
          </div>

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
            {state.fieldErrors?.notes?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.notes[0]}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter>
          {state.ok ? (
            <Link
              href={propertyHref}
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              View units and add tenant
            </Link>
          ) : (
            <Button type="submit" isLoading={isPending} fullWidth>
              Add unit
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
