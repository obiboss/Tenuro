"use client";

import { useMemo, useState, useActionState } from "react";
import { recordManagerRentPaymentAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_COLLECTION_MODE_LABELS,
  MANAGER_MANAGEMENT_FEE_TYPE_LABELS,
  MANAGER_PAYMENT_RECEIVER_LABELS,
  MANAGER_PAYMENT_RECEIVERS,
  type ManagerPaymentMethod,
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

type ManagerPaymentFormProps = {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
};

const PAYMENT_METHOD_LABELS: Record<ManagerPaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateBreakdown(params: {
  amountPaid: number;
  property: ManagerPropertyRow | null;
}) {
  const bopaPlatformFee = 0;
  const paystackCharge = 0;

  if (!params.property || params.amountPaid <= 0) {
    return {
      managerCommission: 0,
      bopaPlatformFee,
      paystackCharge,
      landlordShare: 0,
    };
  }

  const managerCommission =
    params.property.management_fee_type === "percentage"
      ? roundMoney(
          (params.amountPaid * Number(params.property.management_fee_value)) /
            100,
        )
      : roundMoney(
          Math.min(
            Number(params.property.management_fee_value),
            params.amountPaid,
          ),
        );

  const landlordShare = Math.max(
    0,
    roundMoney(
      params.amountPaid - managerCommission - bopaPlatformFee - paystackCharge,
    ),
  );

  return {
    managerCommission,
    bopaPlatformFee,
    paystackCharge,
    landlordShare,
  };
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ManagerPaymentForm({
  landlordClients,
  properties,
  units,
  tenants,
}: ManagerPaymentFormProps) {
  const activeTenants = tenants.filter((tenant) => tenant.status === "active");
  const [selectedTenantId, setSelectedTenantId] = useState(
    activeTenants[0]?.id ?? "",
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

  const [amountPaid, setAmountPaid] = useState(
    activeTenants[0]
      ? String(
          Number(activeTenants[0].current_balance) > 0
            ? activeTenants[0].current_balance
            : activeTenants[0].rent_amount,
        )
      : "",
  );

  const [state, formAction, isPending] = useActionState(
    recordManagerRentPaymentAction,
    initialManagerActionState,
  );

  const amountPaidNumber = Number(amountPaid);
  const breakdown = calculateBreakdown({
    amountPaid: Number.isFinite(amountPaidNumber) ? amountPaidNumber : 0,
    property: selectedProperty,
  });

  function handleTenantChange(tenantId: string) {
    const tenant = activeTenants.find((item) => item.id === tenantId) ?? null;

    setSelectedTenantId(tenantId);
    setAmountPaid(
      tenant
        ? String(
            Number(tenant.current_balance) > 0
              ? tenant.current_balance
              : tenant.rent_amount,
          )
        : "",
    );
  }

  if (activeTenants.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Record payment
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add an active tenant before recording rent payments.
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
        value={selectedTenant?.landlord_client_id ?? ""}
      />
      <input
        type="hidden"
        name="propertyId"
        value={selectedTenant?.property_id ?? ""}
      />
      <input
        type="hidden"
        name="unitId"
        value={selectedTenant?.unit_id ?? ""}
      />

      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Record manual payment
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Use this only for rent already paid outside BOPA checkout.
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
              htmlFor="manager-payment-tenant"
              className="text-sm font-bold text-text-strong"
            >
              Tenant
            </label>
            <select
              id="manager-payment-tenant"
              name="tenantId"
              value={selectedTenantId}
              onChange={(event) => handleTenantChange(event.target.value)}
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
              Rent amount:{" "}
              <span className="font-black text-text-strong">
                {formatNaira(Number(selectedTenant?.rent_amount ?? 0))}
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

          <Input
            label="Amount paid"
            name="amountPaid"
            type="number"
            min="1"
            step="0.01"
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            error={state.fieldErrors?.amountPaid?.[0]}
            required
          />

          <Input
            label="Payment date"
            name="paymentDate"
            type="date"
            defaultValue={getTodayDateValue()}
            error={state.fieldErrors?.paymentDate?.[0]}
            required
          />

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

          <div className="space-y-2">
            <label
              htmlFor="manager-payment-method"
              className="text-sm font-bold text-text-strong"
            >
              Payment method
            </label>
            <select
              id="manager-payment-method"
              name="paymentMethod"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue="bank_transfer"
              required
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.paymentMethod?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.paymentMethod[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-payment-receiver"
              className="text-sm font-bold text-text-strong"
            >
              Payment receiver
            </label>
            <select
              id="manager-payment-receiver"
              name="paymentReceiver"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue={selectedProperty?.payment_receiver ?? "manager"}
              required
            >
              {MANAGER_PAYMENT_RECEIVERS.map((receiver) => (
                <option key={receiver} value={receiver}>
                  {MANAGER_PAYMENT_RECEIVER_LABELS[receiver]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.paymentReceiver?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.paymentReceiver[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Payment reference"
            name="paymentReference"
            placeholder="Bank narration, transfer reference, or receipt number"
            error={state.fieldErrors?.paymentReference?.[0]}
          />

          <Input
            label="Proof URL"
            name="proofUrl"
            type="url"
            placeholder="Optional link to payment proof"
            error={state.fieldErrors?.proofUrl?.[0]}
          />

          <div className="rounded-card border border-primary/20 bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Payment breakdown
            </p>

            <div className="mt-3 space-y-2 text-sm font-semibold text-text-muted">
              <div className="flex items-center justify-between gap-4">
                <span>Amount paid</span>
                <span className="font-black text-text-strong">
                  {formatNaira(
                    Number.isFinite(amountPaidNumber) ? amountPaidNumber : 0,
                  )}
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
                <span>BOPA platform fee</span>
                <span className="font-black text-text-strong">
                  {formatNaira(breakdown.bopaPlatformFee)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>Paystack charge</span>
                <span className="font-black text-text-strong">
                  {formatNaira(breakdown.paystackCharge)}
                </span>
              </div>

              <div className="border-t border-primary/20 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <span>Amount due to landlord</span>
                  <span className="font-black text-text-strong">
                    {formatNaira(breakdown.landlordShare)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-payment-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-payment-notes"
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
            Record Payment
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
