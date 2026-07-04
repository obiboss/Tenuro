"use client";

import { useMemo, useState, useActionState } from "react";
import { createManagerUnitAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_UNIT_STATUS_LABELS,
  MANAGER_UNIT_STATUSES,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ManagerPropertyRow } from "@/server/repositories/manager.repository";

type ManagerUnitFormProps = {
  properties: ManagerPropertyRow[];
};

export function ManagerUnitForm({ properties }: ManagerUnitFormProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id ?? "",
  );

  const [state, formAction, isPending] = useActionState(
    createManagerUnitAction,
    initialManagerActionState,
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId],
  );

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add unit
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add a property first before creating units.
            </p>
          </div>
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
              Add flats, shops, offices, or rooms under a property.
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
              {state.message}
            </div>
          ) : null}

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
            {state.fieldErrors?.landlordClientId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.landlordClientId[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Unit"
            name="unitLabel"
            placeholder="Example: Flat 2A"
            error={state.fieldErrors?.unitLabel?.[0]}
            required
          />

          <Input
            label="Unit type"
            name="unitType"
            placeholder="Example: 2-bedroom flat"
            error={state.fieldErrors?.unitType?.[0]}
          />

          <Input
            label="Rent amount"
            name="rentAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Example: 1200000"
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
              {MANAGER_UNIT_STATUSES.map((status) => (
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
              placeholder="Optional note"
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
          <Button type="submit" isLoading={isPending} fullWidth>
            Add Unit
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

