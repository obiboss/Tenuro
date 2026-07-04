"use client";

import { useMemo, useState, useActionState } from "react";
import { createManagerMaintenanceRequestAction } from "@/actions/manager-maintenance.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_MAINTENANCE_PRIORITIES,
  MANAGER_MAINTENANCE_PRIORITY_LABELS,
  MANAGER_MAINTENANCE_STATUSES,
  MANAGER_MAINTENANCE_STATUS_LABELS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerMaintenanceFormProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
};

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ManagerMaintenanceForm({
  landlordClients,
  properties,
  units,
  tenants,
}: ManagerMaintenanceFormProps) {
  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    activeProperties[0]?.id ?? "",
  );
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const selectedProperty = useMemo(
    () =>
      activeProperties.find((property) => property.id === selectedPropertyId) ??
      null,
    [activeProperties, selectedPropertyId],
  );

  const unitsForProperty = useMemo(
    () => units.filter((unit) => unit.property_id === selectedPropertyId),
    [selectedPropertyId, units],
  );

  const tenantsForSelection = useMemo(
    () =>
      tenants.filter((tenant) => {
        if (tenant.property_id !== selectedPropertyId) {
          return false;
        }

        if (selectedUnitId && tenant.unit_id !== selectedUnitId) {
          return false;
        }

        return tenant.status === "active";
      }),
    [selectedPropertyId, selectedUnitId, tenants],
  );

  const selectedLandlordClient = useMemo(
    () =>
      selectedProperty
        ? (landlordClients.find(
            (client) => client.id === selectedProperty.landlord_client_id,
          ) ?? null)
        : null,
    [landlordClients, selectedProperty],
  );

  const [state, formAction, isPending] = useActionState(
    createManagerMaintenanceRequestAction,
    initialManagerActionState,
  );

  function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedTenantId("");
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    setSelectedTenantId("");
  }

  if (activeProperties.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Record maintenance issue
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add an active property before recording maintenance issues.
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
              Record maintenance issue
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Track repairs without creating a complex vendor workflow.
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

          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Landlord Client:{" "}
              <span className="font-black text-text-strong">
                {selectedLandlordClient?.landlord_name ?? "Not available"}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-property"
              className="text-sm font-bold text-text-strong"
            >
              Property
            </label>
            <select
              id="manager-maintenance-property"
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
            {state.fieldErrors?.landlordClientId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.landlordClientId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-unit"
              className="text-sm font-bold text-text-strong"
            >
              Unit
            </label>
            <select
              id="manager-maintenance-unit"
              name="unitId"
              value={selectedUnitId}
              onChange={(event) => handleUnitChange(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            >
              <option value="">Property-wide issue</option>
              {unitsForProperty.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.unitId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.unitId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-tenant"
              className="text-sm font-bold text-text-strong"
            >
              Tenant
            </label>
            <select
              id="manager-maintenance-tenant"
              name="tenantId"
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            >
              <option value="">No tenant linked</option>
              {tenantsForSelection.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.tenantId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.tenantId[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Repair issue"
            name="issueTitle"
            placeholder="Example: Leaking kitchen sink"
            error={state.fieldErrors?.issueTitle?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-description"
              className="text-sm font-bold text-text-strong"
            >
              Issue description
            </label>
            <textarea
              id="manager-maintenance-description"
              name="issueDescription"
              rows={4}
              placeholder="Describe the problem briefly"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />
            {state.fieldErrors?.issueDescription?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.issueDescription[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="manager-maintenance-priority"
                className="text-sm font-bold text-text-strong"
              >
                Priority
              </label>
              <select
                id="manager-maintenance-priority"
                name="priority"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                defaultValue="medium"
                required
              >
                {MANAGER_MAINTENANCE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {MANAGER_MAINTENANCE_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.priority?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.priority[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="manager-maintenance-status"
                className="text-sm font-bold text-text-strong"
              >
                Status
              </label>
              <select
                id="manager-maintenance-status"
                name="status"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                defaultValue="reported"
                required
              >
                {MANAGER_MAINTENANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {MANAGER_MAINTENANCE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.status?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.status[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Estimated cost"
              name="estimatedCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              error={state.fieldErrors?.estimatedCost?.[0]}
            />

            <Input
              label="Actual cost"
              name="actualCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              error={state.fieldErrors?.actualCost?.[0]}
            />
          </div>

          <Input
            label="Vendor / technician"
            name="vendorName"
            placeholder="Optional"
            error={state.fieldErrors?.vendorName?.[0]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Reported date"
              name="reportedDate"
              type="date"
              defaultValue={getTodayDateValue()}
              error={state.fieldErrors?.reportedDate?.[0]}
              required
            />

            <Input
              label="Resolved date"
              name="resolvedDate"
              type="date"
              error={state.fieldErrors?.resolvedDate?.[0]}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-maintenance-notes"
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
            Record Maintenance
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
