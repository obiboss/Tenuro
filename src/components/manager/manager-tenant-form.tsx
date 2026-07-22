"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { createManagerTenantAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveManagerTenantOffline } from "@/lib/offline/operational-mutations.client";
import {
  calculateCurrentRentDueDate,
  calculateNextRentDueDate,
  getCurrentLagosDateOnly,
  RENT_PAYMENT_FREQUENCY_LABELS,
} from "@/lib/rent-cycle";
import type {
  ManagerPropertyRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerTenantFormProps = {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  lockedPropertyId?: string;
  lockedUnitId?: string;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value: string) {
  if (!value) {
    return "Enter the move-in date";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function ManagerTenantForm({
  properties,
  units,
  lockedPropertyId,
  lockedUnitId,
}: ManagerTenantFormProps) {
  const activeProperties = properties.filter(
    (property) => property.status === "active",
  );
  const initialPropertyId = lockedPropertyId ?? activeProperties[0]?.id ?? "";
  const [selectedPropertyId, setSelectedPropertyId] =
    useState(initialPropertyId);
  const vacantUnitsForProperty = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.property_id === selectedPropertyId && unit.status === "vacant",
      ),
    [selectedPropertyId, units],
  );
  const initialUnitId = lockedUnitId ?? vacantUnitsForProperty[0]?.id ?? "";
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId);
  const [moveInDate, setMoveInDate] = useState("");
  const [currentBalance, setCurrentBalance] = useState("0");

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

  const rentDueDate = useMemo(() => {
    if (!selectedUnit || !moveInDate) {
      return "";
    }

    try {
      const balance = Number(currentBalance || 0);
      const calculator = balance > 0
        ? calculateCurrentRentDueDate
        : calculateNextRentDueDate;

      return calculator({
        anchorDate: moveInDate,
        paymentFrequency: selectedUnit.rent_frequency,
      });
    } catch {
      return "";
    }
  }, [currentBalance, moveInDate, selectedUnit]);

  const offlineCapableAction = useCallback(
    (previousState: typeof initialManagerActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: createManagerTenantAction,
        saveOffline: saveManagerTenantOffline,
      }),
    [],
  );
  const [state, formAction, isPending] = useActionState(
    offlineCapableAction,
    initialManagerActionState,
  );

  const isLockedToUnit = Boolean(lockedPropertyId && lockedUnitId);
  const submitDisabledReason =
    vacantUnitsForProperty.length === 0
      ? "Choose a property with a vacant unit to continue."
      : !selectedUnitId
        ? "Choose a vacant unit to continue."
        : null;

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
            Add existing tenant
          </h2>
          <p className="rounded-card bg-surface p-4 text-sm font-semibold leading-6 text-text-muted">
            Add an active property first before creating tenants.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.ok) {
    return (
      <Card>
        <CardContent>
          <div role="alert" className="rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            {state.message || "Tenant added successfully."}
          </div>
          <div className="rounded-card bg-surface p-4">
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Tenant saved
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              {state.offlineSaved
                ? "The tenant is visible immediately. BOPA will sync the record automatically."
                : "The unit now shows as occupied, with rent dates calculated from the move-in date."}
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
      <input
        type="hidden"
        name="rentAmount"
        value={selectedUnit?.rent_amount ?? ""}
      />
      <input
        type="hidden"
        name="paymentFrequency"
        value={selectedUnit?.rent_frequency ?? "annual"}
      />
      <input type="hidden" name="nextRentDueDate" value={rentDueDate} />

      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              {isLockedToUnit ? "Add current occupant" : "Add existing tenant"}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              The selected unit controls the rent amount and collection frequency.
            </p>
          </div>

          {state.message ? (
            <div role="alert" className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {state.message}
            </div>
          ) : null}

          {isLockedToUnit ? (
            <>
              <input type="hidden" name="propertyId" value={selectedPropertyId} />
              <input type="hidden" name="unitId" value={selectedUnitId} />
              <div className="rounded-card bg-primary-soft p-4">
                <p className="text-sm font-semibold text-text-muted">
                  <span className="font-black text-text-strong">
                    {selectedProperty?.property_name ?? "Property"}
                  </span>{" "}
                  · {selectedUnit?.unit_label ?? "Unit"}
                </p>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="manager-tenant-property" className="text-sm font-bold text-text-strong">
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
              </div>
              <div className="space-y-2">
                <label htmlFor="manager-tenant-unit" className="text-sm font-bold text-text-strong">
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
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-button border border-border-soft bg-background px-4 py-3">
              <p className="text-sm font-bold text-text-muted">Unit rent</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatNaira(selectedUnit?.rent_amount ?? 0)}
              </p>
            </div>
            <div className="rounded-button border border-border-soft bg-background px-4 py-3">
              <p className="text-sm font-bold text-text-muted">Rent collection</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {selectedUnit
                  ? RENT_PAYMENT_FREQUENCY_LABELS[selectedUnit.rent_frequency]
                  : "Select a unit"}
              </p>
            </div>
          </div>

          <Input label="Tenant name" name="fullName" placeholder="Example: Mrs Ada Nwankwo" autoComplete="name" error={state.fieldErrors?.fullName?.[0]} required />
          <Input label="Tenant phone" name="phoneNumber" placeholder="Example: 08012345678" autoComplete="tel" error={state.fieldErrors?.phoneNumber?.[0]} required />
          <Input label="Tenant email" name="email" type="email" placeholder="Optional" autoComplete="email" error={state.fieldErrors?.email?.[0]} />
          <Input label="Occupation" name="occupation" placeholder="Optional" error={state.fieldErrors?.occupation?.[0]} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Original move-in date"
              name="moveInDate"
              type="date"
              value={moveInDate}
              onChange={(event) => setMoveInDate(event.target.value)}
              helperText="This is the permanent rent-cycle anchor."
              error={state.fieldErrors?.moveInDate?.[0]}
              required
            />
            <div className="rounded-button border border-border-soft bg-background px-4 py-3">
              <p className="text-sm font-bold text-text-muted">Rent due date</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatDate(rentDueDate)}
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                Shows the outstanding cycle when owing, otherwise the next renewal date.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-card border border-border-soft bg-surface p-4">
            <div>
              <h3 className="font-black text-text-strong">Last rent payment</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Record the most recent amount and payment date. The payment date does not change the rent-cycle anchor.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                label="Amount last paid"
                name="lastPaymentAmount"
                error={state.fieldErrors?.lastPaymentAmount?.[0]}
                required
              />
              <Input
                label="Date of last payment"
                name="lastPaymentDate"
                type="date"
                max={getCurrentLagosDateOnly()}
                error={state.fieldErrors?.lastPaymentDate?.[0]}
                required
              />
            </div>
          </div>

          <CurrencyInput
            label="Amount currently owed"
            name="currentBalance"
            value={currentBalance}
            onValueChange={setCurrentBalance}
            helperText="Enter 0 when the tenant is fully paid up."
            error={state.fieldErrors?.currentBalance?.[0]}
            required
          />

          <div className="space-y-2">
            <label htmlFor="manager-tenant-notes" className="text-sm font-bold text-text-strong">
              Notes
            </label>
            <textarea
              id="manager-tenant-notes"
              name="notes"
              rows={3}
              placeholder="Optional note"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />
          </div>
        </CardContent>

        <CardFooter>
          <div className="w-full space-y-3">
            {submitDisabledReason ? (
              <p className="text-sm font-semibold text-danger">
                {submitDisabledReason}
              </p>
            ) : null}
            <Button type="submit" isLoading={isPending} disabled={Boolean(submitDisabledReason)} fullWidth>
              Save existing tenant
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
