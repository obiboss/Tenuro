"use client";

import { useMemo, useState, useActionState } from "react";
import { createManagerTenantAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_TENANT_STATUS_LABELS,
  MANAGER_TENANT_STATUSES,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ManagerPropertyRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerTenantFormProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
};

export function ManagerTenantForm({
  properties,
  units,
}: ManagerTenantFormProps) {
  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    activeProperties[0]?.id ?? "",
  );

  const vacantUnitsForProperty = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.property_id === selectedPropertyId && unit.status === "vacant",
      ),
    [selectedPropertyId, units],
  );

  const [selectedUnitId, setSelectedUnitId] = useState(
    vacantUnitsForProperty[0]?.id ?? "",
  );

  const selectedProperty = useMemo(
    () =>
      activeProperties.find((property) => property.id === selectedPropertyId) ??
      null,
    [activeProperties, selectedPropertyId],
  );

  const selectedUnit = useMemo(
    () => vacantUnitsForProperty.find((unit) => unit.id === selectedUnitId),
    [selectedUnitId, vacantUnitsForProperty],
  );

  const [state, formAction, isPending] = useActionState(
    createManagerTenantAction,
    initialManagerActionState,
  );

  function handlePropertyChange(propertyId: string) {
    const firstVacantUnit = units.find(
      (unit) => unit.property_id === propertyId && unit.status === "vacant",
    );

    setSelectedPropertyId(propertyId);
    setSelectedUnitId(firstVacantUnit?.id ?? "");
  }

  if (activeProperties.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add tenant
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add an active property first before creating tenants.
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
              Add tenant
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Assign the tenant to a vacant unit and enter the current rent
              position.
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
              htmlFor="manager-tenant-property"
              className="text-sm font-bold text-text-strong"
            >
              Property
            </label>
            <select
              id="manager-tenant-property"
              name="propertyId"
              value={selectedPropertyId}
              onChange={(event) => handlePropertyChange(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {activeProperties.map((property) => (
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

          <div className="space-y-2">
            <label
              htmlFor="manager-tenant-unit"
              className="text-sm font-bold text-text-strong"
            >
              Unit
            </label>
            <select
              id="manager-tenant-unit"
              name="unitId"
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {vacantUnitsForProperty.length > 0 ? (
                vacantUnitsForProperty.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_label}
                  </option>
                ))
              ) : (
                <option value="">No vacant unit available</option>
              )}
            </select>
            {state.fieldErrors?.unitId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.unitId[0]}
              </p>
            ) : null}
            {state.fieldErrors?.landlordClientId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.landlordClientId[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Tenant name"
            name="fullName"
            placeholder="Example: Mrs Ada Nwankwo"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Tenant phone"
            name="phoneNumber"
            placeholder="Example: 08012345678"
            autoComplete="tel"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

          <Input
            label="Tenant email"
            name="email"
            type="email"
            placeholder="Optional"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
          />

          <Input
            key={`rent-${selectedUnit?.id ?? "none"}`}
            label="Rent amount"
            name="rentAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={selectedUnit?.rent_amount ?? 0}
            error={state.fieldErrors?.rentAmount?.[0]}
            required
          />

          <Input
            label="Move-in date"
            name="moveInDate"
            type="date"
            error={state.fieldErrors?.moveInDate?.[0]}
          />

          <Input
            label="Next rent due date"
            name="nextRentDueDate"
            type="date"
            error={state.fieldErrors?.nextRentDueDate?.[0]}
          />

          <Input
            label="Current balance"
            name="currentBalance"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            helperText="Enter 0 if the tenant is not owing."
            error={state.fieldErrors?.currentBalance?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-tenant-status"
              className="text-sm font-bold text-text-strong"
            >
              Status
            </label>
            <select
              id="manager-tenant-status"
              name="status"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue="active"
              required
            >
              {MANAGER_TENANT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MANAGER_TENANT_STATUS_LABELS[status]}
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
              htmlFor="manager-tenant-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-tenant-notes"
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
          <Button
            type="submit"
            isLoading={isPending}
            disabled={vacantUnitsForProperty.length === 0}
            fullWidth
          >
            Add Tenant
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
