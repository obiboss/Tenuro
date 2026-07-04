"use client";

import { useMemo, useState, useActionState } from "react";
import { createManagerPaystackPaymentRequestAction } from "@/actions/manager-paystack.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_COLLECTION_MODE_LABELS,
  MANAGER_MANAGEMENT_FEE_TYPE_LABELS,
} from "@/constants/manager";
import { calculateManagerPaymentBreakdown } from "@/lib/manager-automation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPaystackPaymentLinkFormProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function ManagerPaystackPaymentLinkForm({
  landlordClients,
  properties,
  units,
  tenants,
}: ManagerPaystackPaymentLinkFormProps) {
  const activeTenants = tenants.filter((tenant) => tenant.status === "active");
  const [selectedTenantId, setSelectedTenantId] = useState(
    activeTenants[0]?.id ?? "",
  );

  const [state, formAction, isPending] = useActionState(
    createManagerPaystackPaymentRequestAction,
    initialManagerActionState,
  );

  const selectedTenant = useMemo(
    () =>
      activeTenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [activeTenants, selectedTenantId],
  );

  const selectedProperty = useMemo(
    () =>
      selectedTenant
        ? (properties.find(
            (property) => property.id === selectedTenant.property_id,
          ) ?? null)
        : null,
    [properties, selectedTenant],
  );

  const selectedUnit = useMemo(
    () =>
      selectedTenant
        ? (units.find((unit) => unit.id === selectedTenant.unit_id) ?? null)
        : null,
    [selectedTenant, units],
  );

  const selectedLandlordClient = useMemo(
    () =>
      selectedTenant
        ? (landlordClients.find(
            (client) => client.id === selectedTenant.landlord_client_id,
          ) ?? null)
        : null,
    [landlordClients, selectedTenant],
  );

  const amountToPay = selectedTenant
    ? Number(selectedTenant.current_balance) > 0
      ? Number(selectedTenant.current_balance)
      : Number(selectedTenant.rent_amount)
    : 0;

  const breakdown = selectedProperty
    ? calculateManagerPaymentBreakdown({
        amountPaid: amountToPay,
        managementFeeType: selectedProperty.management_fee_type,
        managementFeeValue: Number(selectedProperty.management_fee_value),
      })
    : calculateManagerPaymentBreakdown({
        amountPaid: 0,
        managementFeeType: "percentage",
        managementFeeValue: 0,
      });

  if (activeTenants.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Create Paystack link
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add an active tenant before creating Paystack payment links.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Create Paystack link
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Select the tenant. BOPA fills the rent amount and split details
              automatically.
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
              htmlFor="manager-paystack-tenant"
              className="text-sm font-bold text-text-strong"
            >
              Tenant
            </label>
            <select
              id="manager-paystack-tenant"
              name="tenantId"
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {activeTenants.map((tenant) => (
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

          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-black text-text-strong">
              {selectedTenant?.full_name ?? "Tenant"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Landlord Client:{" "}
              <span className="font-black text-text-strong">
                {selectedLandlordClient?.landlord_name ?? "Not available"}
              </span>
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Property:{" "}
              <span className="font-black text-text-strong">
                {selectedProperty?.property_name ?? "Not available"}
              </span>
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Unit:{" "}
              <span className="font-black text-text-strong">
                {selectedUnit?.unit_label ?? "Not available"}
              </span>
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Amount to pay:{" "}
              <span className="font-black text-text-strong">
                {formatNaira(amountToPay)}
              </span>
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Collection mode:{" "}
              <span className="font-black text-text-strong">
                {selectedProperty
                  ? MANAGER_COLLECTION_MODE_LABELS[
                      selectedProperty.collection_mode
                    ]
                  : "Not available"}
              </span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Rent period start"
              name="periodStart"
              type="date"
              error={state.fieldErrors?.periodStart?.[0]}
            />

            <Input
              label="Rent period end"
              name="periodEnd"
              type="date"
              error={state.fieldErrors?.periodEnd?.[0]}
            />
          </div>

          <div className="rounded-card border border-primary/20 bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Automatic breakdown
            </p>

            <div className="mt-3 space-y-2 text-sm font-semibold text-text-muted">
              <div className="flex items-center justify-between gap-4">
                <span>Amount paid</span>
                <span className="font-black text-text-strong">
                  {formatNaira(breakdown.amountPaid)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>
                  Management fee
                  {selectedProperty ? (
                    <>
                      {" "}
                      ·{" "}
                      {
                        MANAGER_MANAGEMENT_FEE_TYPE_LABELS[
                          selectedProperty.management_fee_type
                        ]
                      }
                    </>
                  ) : null}
                </span>
                <span className="font-black text-text-strong">
                  {formatNaira(breakdown.managerCommission)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>Amount due to landlord</span>
                <span className="font-black text-text-strong">
                  {formatNaira(breakdown.landlordShare)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-paystack-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-paystack-notes"
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
            Create Paystack Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
