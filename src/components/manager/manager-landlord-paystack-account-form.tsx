"use client";

import { useActionState, useMemo, useState } from "react";
import { saveManagerLandlordPaystackAccountAction } from "@/actions/manager-paystack-accounts.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerLandlordPaystackAccountFormProps = {
  landlordClients: ManagerLandlordClientRow[];
};

export function ManagerLandlordPaystackAccountForm({
  landlordClients,
}: ManagerLandlordPaystackAccountFormProps) {
  const activeLandlords = landlordClients.filter(
    (client) => client.status === "active",
  );

  const [selectedLandlordId, setSelectedLandlordId] = useState(
    activeLandlords[0]?.id ?? "",
  );

  const selectedLandlord = useMemo(
    () =>
      activeLandlords.find((client) => client.id === selectedLandlordId) ??
      null,
    [activeLandlords, selectedLandlordId],
  );

  const [state, formAction, isPending] = useActionState(
    saveManagerLandlordPaystackAccountAction,
    initialManagerActionState,
  );

  if (activeLandlords.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Landlord payout account
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add a landlord client before saving landlord payout accounts.
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
              Landlord payout account
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              This is the account used when a landlord should receive rent
              online.
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
              htmlFor="manager-landlord-paystack-client"
              className="text-sm font-bold text-text-strong"
            >
              Landlord client
            </label>
            <select
              id="manager-landlord-paystack-client"
              name="landlordClientId"
              value={selectedLandlordId}
              onChange={(event) => setSelectedLandlordId(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {activeLandlords.map((client) => (
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
            label="Business name"
            name="businessName"
            defaultValue={selectedLandlord?.landlord_name ?? ""}
            error={state.fieldErrors?.businessName?.[0]}
            required
          />

          <Input
            label="Contact name"
            name="contactName"
            defaultValue={selectedLandlord?.landlord_name ?? ""}
            error={state.fieldErrors?.contactName?.[0]}
            required
          />

          <Input
            label="Contact phone"
            name="contactPhone"
            placeholder="080..."
            error={state.fieldErrors?.contactPhone?.[0]}
            required
          />

          <Input
            label="Contact email"
            name="contactEmail"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.contactEmail?.[0]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Bank name"
              name="bankName"
              placeholder="Example: Access Bank"
              error={state.fieldErrors?.bankName?.[0]}
              required
            />

            <Input
              label="Bank code"
              name="bankCode"
              placeholder="Example: 044"
              error={state.fieldErrors?.bankCode?.[0]}
              required
            />
          </div>

          <Input
            label="Account number"
            name="accountNumber"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digit account number"
            error={state.fieldErrors?.accountNumber?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Save Landlord Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
