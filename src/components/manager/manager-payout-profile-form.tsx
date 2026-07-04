"use client";

import { useActionState } from "react";
import { saveManagerLandlordPayoutProfileAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_PAYMENT_RECEIVER_LABELS,
  MANAGER_PAYMENT_RECEIVERS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ManagerLandlordClientRow } from "@/server/repositories/manager.repository";

type ManagerPayoutProfileFormProps = {
  landlordClients: ManagerLandlordClientRow[];
};

export function ManagerPayoutProfileForm({
  landlordClients,
}: ManagerPayoutProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveManagerLandlordPayoutProfileAction,
    initialManagerActionState,
  );

  if (landlordClients.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add payout profile
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add a landlord client first before saving payout details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="isDefault" value="true" />

      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Add payout profile
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Save where a landlord wants remittances sent.
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
              htmlFor="manager-payout-landlord"
              className="text-sm font-bold text-text-strong"
            >
              Landlord Client
            </label>
            <select
              id="manager-payout-landlord"
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

          <div className="space-y-2">
            <label
              htmlFor="manager-payout-receiver"
              className="text-sm font-bold text-text-strong"
            >
              Payment Receiver
            </label>
            <select
              id="manager-payout-receiver"
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

          <Input
            label="Receiver name"
            name="receiverName"
            placeholder="Example: Mr Chinedu Okeke"
            error={state.fieldErrors?.receiverName?.[0]}
            required
          />

          <Input
            label="Receiver phone"
            name="receiverPhone"
            placeholder="Optional"
            error={state.fieldErrors?.receiverPhone?.[0]}
          />

          <Input
            label="Bank name"
            name="bankName"
            placeholder="Example: GTBank"
            error={state.fieldErrors?.bankName?.[0]}
          />

          <Input
            label="Bank code"
            name="bankCode"
            placeholder="Optional"
            error={state.fieldErrors?.bankCode?.[0]}
          />

          <Input
            label="Account number"
            name="accountNumber"
            placeholder="10-digit account number"
            inputMode="numeric"
            error={state.fieldErrors?.accountNumber?.[0]}
          />

          <Input
            label="Account name"
            name="accountName"
            placeholder="Account name"
            error={state.fieldErrors?.accountName?.[0]}
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-payout-note"
              className="text-sm font-bold text-text-strong"
            >
              Payout note
            </label>
            <textarea
              id="manager-payout-note"
              name="payoutNote"
              rows={3}
              placeholder="Optional note"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />
            {state.fieldErrors?.payoutNote?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.payoutNote[0]}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Save Payout Profile
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
