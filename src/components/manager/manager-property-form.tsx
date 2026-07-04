"use client";

import { useActionState } from "react";
import { createManagerPropertyAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_COLLECTION_MODE_LABELS,
  MANAGER_COLLECTION_MODES,
  MANAGER_MANAGEMENT_FEE_TYPE_LABELS,
  MANAGER_MANAGEMENT_FEE_TYPES,
  MANAGER_PAYMENT_RECEIVER_LABELS,
  MANAGER_PAYMENT_RECEIVERS,
  MANAGER_PAYSTACK_CHARGE_BEARER_LABELS,
  MANAGER_PAYSTACK_CHARGE_BEARERS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerPropertyFormProps = {
  landlordClients: ManagerLandlordClientRow[];
};

export function ManagerPropertyForm({
  landlordClients,
}: ManagerPropertyFormProps) {
  const [state, formAction, isPending] = useActionState(
    createManagerPropertyAction,
    initialManagerActionState,
  );

  if (landlordClients.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add property
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add a landlord client first before creating a property.
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
              Add property
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Set who owns the property and how rent should be collected.
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
              htmlFor="manager-property-landlord"
              className="text-sm font-bold text-text-strong"
            >
              Landlord Client
            </label>
            <select
              id="manager-property-landlord"
              name="landlordClientId"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {landlordClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.landlord_name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.landlordClientId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.landlordClientId[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Property"
            name="propertyName"
            placeholder="Example: Unity Court"
            error={state.fieldErrors?.propertyName?.[0]}
            required
          />

          <Input
            label="Property address"
            name="propertyAddress"
            placeholder="Example: 12 Admiralty Road, Lekki"
            error={state.fieldErrors?.propertyAddress?.[0]}
            required
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              name="city"
              placeholder="Lagos"
              error={state.fieldErrors?.city?.[0]}
            />

            <Input
              label="State"
              name="state"
              placeholder="Lagos"
              error={state.fieldErrors?.state?.[0]}
            />

            <Input
              label="LGA"
              name="lga"
              placeholder="Eti-Osa"
              error={state.fieldErrors?.lga?.[0]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="manager-property-collection-mode"
                className="text-sm font-bold text-text-strong"
              >
                Collection Mode
              </label>
              <select
                id="manager-property-collection-mode"
                name="collectionMode"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                required
              >
                {MANAGER_COLLECTION_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {MANAGER_COLLECTION_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.collectionMode?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.collectionMode[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="manager-property-payment-receiver"
                className="text-sm font-bold text-text-strong"
              >
                Payment Receiver
              </label>
              <select
                id="manager-property-payment-receiver"
                name="paymentReceiver"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                defaultValue="landlord"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="manager-property-fee-type"
                className="text-sm font-bold text-text-strong"
              >
                Management Fee
              </label>
              <select
                id="manager-property-fee-type"
                name="managementFeeType"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                required
              >
                {MANAGER_MANAGEMENT_FEE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MANAGER_MANAGEMENT_FEE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.managementFeeType?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.managementFeeType[0]}
                </p>
              ) : null}
            </div>

            <Input
              label="Fee value"
              name="managementFeeValue"
              type="number"
              min="0"
              step="0.01"
              placeholder="Example: 10"
              error={state.fieldErrors?.managementFeeValue?.[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-property-charge-bearer"
              className="text-sm font-bold text-text-strong"
            >
              Paystack charge bearer
            </label>
            <select
              id="manager-property-charge-bearer"
              name="paystackChargeBearer"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue="tenant"
              required
            >
              {MANAGER_PAYSTACK_CHARGE_BEARERS.map((bearer) => (
                <option key={bearer} value={bearer}>
                  {MANAGER_PAYSTACK_CHARGE_BEARER_LABELS[bearer]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.paystackChargeBearer?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.paystackChargeBearer[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-property-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-property-notes"
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
            Add Property
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

