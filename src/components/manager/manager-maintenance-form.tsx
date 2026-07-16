"use client";

import { useActionState, useMemo, useState } from "react";
import { createManagerMaintenanceRequestAction } from "@/actions/manager-maintenance.actions";
import {
  initialManagerActionState,
  type ManagerActionState,
} from "@/actions/manager.state";
import {
  MANAGER_MAINTENANCE_PRIORITIES,
  MANAGER_MAINTENANCE_PRIORITY_LABELS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
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

type MaintenanceFormFieldsProps = ManagerMaintenanceFormProps & {
  formAction: (formData: FormData) => void;
  isPending: boolean;
  state: ManagerActionState;
};

function getNigeriaDateValue() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function MaintenanceFormFields({
  landlordClients,
  properties,
  units,
  tenants,
  formAction,
  isPending,
  state,
}: MaintenanceFormFieldsProps) {
  const activeProperties = useMemo(
    () => properties.filter((property) => property.status === "active"),
    [properties],
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    activeProperties[0]?.id ?? "",
  );
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const selectedProperty =
    activeProperties.find(
      (property) => property.id === selectedPropertyId,
    ) ?? null;

  const selectedLandlord =
    landlordClients.find(
      (landlord) =>
        landlord.id === selectedProperty?.landlord_client_id,
    ) ?? null;

  const availableUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.property_id === selectedPropertyId &&
          unit.status !== "inactive",
      ),
    [selectedPropertyId, units],
  );

  const availableTenants = useMemo(
    () =>
      tenants.filter(
        (tenant) =>
          tenant.property_id === selectedPropertyId &&
          (!selectedUnitId || tenant.unit_id === selectedUnitId) &&
          (tenant.status === "active" ||
            tenant.status === "eviction_notice"),
      ),
    [selectedPropertyId, selectedUnitId, tenants],
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
          <h2 className="text-lg font-black text-text-strong">
            Add a property first
          </h2>

          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Maintenance issues must be connected to a managed property.
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

      <input
        type="hidden"
        name="reportedDate"
        value={getNigeriaDateValue()}
      />

      <Card>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Record maintenance issue
            </h2>

            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Capture the issue and the amount expected for the repair.
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
              onChange={(event) =>
                handlePropertyChange(event.target.value)
              }
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {activeProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name}
                </option>
              ))}
            </select>

            {selectedLandlord ? (
              <p className="text-xs font-semibold text-text-muted">
                Landlord: {selectedLandlord.landlord_name}
              </p>
            ) : null}

            {state.fieldErrors?.propertyId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.propertyId[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                onChange={(event) =>
                  handleUnitChange(event.target.value)
                }
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              >
                <option value="">Property-wide issue</option>

                {availableUnits.map((unit) => (
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
                onChange={(event) =>
                  setSelectedTenantId(event.target.value)
                }
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              >
                <option value="">No tenant linked</option>

                {availableTenants.map((tenant) => (
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
          </div>

          <Input
            label="Issue"
            name="issueTitle"
            placeholder="For example, leaking bathroom pipe"
            error={state.fieldErrors?.issueTitle?.[0]}
            required
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-description"
              className="text-sm font-bold text-text-strong"
            >
              Description
            </label>

            <textarea
              id="manager-maintenance-description"
              name="issueDescription"
              rows={3}
              placeholder="Optional details about the problem"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />

            {state.fieldErrors?.issueDescription?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.issueDescription[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              label="Expected amount"
              name="estimatedCost"
              placeholder="0.00"
              error={state.fieldErrors?.estimatedCost?.[0]}
              required
            />

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
                defaultValue="medium"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
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
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-maintenance-notes"
              className="text-sm font-bold text-text-strong"
            >
              Note
            </label>

            <textarea
              id="manager-maintenance-notes"
              name="notes"
              rows={3}
              placeholder="Optional internal note"
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
            Record issue
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function ManagerMaintenanceForm(
  props: ManagerMaintenanceFormProps,
) {
  const [dismissedToastId, setDismissedToastId] =
    useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    createManagerMaintenanceRequestAction,
    initialManagerActionState,
  );

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = [
      "maintenance",
      state.ok ? "success" : "error",
      state.submissionId ?? state.message,
    ].join("-");

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok
        ? "Issue recorded"
        : "Could not record issue",
      description: state.message,
    };
  }, [
    dismissedToastId,
    state.message,
    state.ok,
    state.submissionId,
  ]);

  const formKey =
    state.ok && state.submissionId
      ? state.submissionId
      : "maintenance-form";

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast
            toast={toast}
            onDismiss={setDismissedToastId}
          />
        </div>
      ) : null}

      <MaintenanceFormFields
        key={formKey}
        {...props}
        formAction={formAction}
        isPending={isPending}
        state={state}
      />
    </>
  );
}