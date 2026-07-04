"use client";

import { useMemo, useState, useActionState } from "react";
import { recordManagerLandlordRemittanceAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import {
  MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS,
  MANAGER_REMITTANCE_PAYMENT_METHODS,
} from "@/constants/manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ManagerLandlordClientRow,
  ManagerLandlordPayoutProfileRow,
  ManagerLandlordRemittanceSummary,
} from "@/server/repositories/manager.repository";

type ManagerRemittanceFormProps = {
  landlordClients: ManagerLandlordClientRow[];
  payoutProfiles: ManagerLandlordPayoutProfileRow[];
  summaries: ManagerLandlordRemittanceSummary[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ManagerRemittanceForm({
  landlordClients,
  payoutProfiles,
  summaries,
}: ManagerRemittanceFormProps) {
  const [selectedLandlordClientId, setSelectedLandlordClientId] = useState(
    landlordClients[0]?.id ?? "",
  );

  const matchingPayoutProfiles = useMemo(
    () =>
      payoutProfiles.filter(
        (profile) => profile.landlord_client_id === selectedLandlordClientId,
      ),
    [payoutProfiles, selectedLandlordClientId],
  );

  const selectedSummary = useMemo(
    () =>
      summaries.find(
        (summary) => summary.landlordClientId === selectedLandlordClientId,
      ) ?? null,
    [selectedLandlordClientId, summaries],
  );

  const [state, formAction, isPending] = useActionState(
    recordManagerLandlordRemittanceAction,
    initialManagerActionState,
  );

  if (landlordClients.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Record remittance
          </h2>
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-semibold leading-6 text-text-muted">
              Add a landlord client before recording remittances.
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
              Record remittance
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Record money manually sent to a landlord. This does not transfer
              money.
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
              htmlFor="manager-remittance-landlord"
              className="text-sm font-bold text-text-strong"
            >
              Landlord Client
            </label>
            <select
              id="manager-remittance-landlord"
              name="landlordClientId"
              value={selectedLandlordClientId}
              onChange={(event) =>
                setSelectedLandlordClientId(event.target.value)
              }
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

          <div className="rounded-card bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Remittance position
            </p>
            <div className="mt-3 space-y-2 text-sm font-semibold text-text-muted">
              <div className="flex items-center justify-between gap-4">
                <span>Amount due to landlord</span>
                <span className="font-black text-text-strong">
                  {formatNaira(selectedSummary?.amountDueToLandlord ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Already remitted</span>
                <span className="font-black text-text-strong">
                  {formatNaira(selectedSummary?.amountRemitted ?? 0)}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <span>Pending balance</span>
                  <span className="font-black text-text-strong">
                    {formatNaira(selectedSummary?.pendingBalance ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-remittance-payout-profile"
              className="text-sm font-bold text-text-strong"
            >
              Payout profile
            </label>
            <select
              id="manager-remittance-payout-profile"
              name="payoutProfileId"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue={matchingPayoutProfiles[0]?.id ?? ""}
            >
              <option value="">No payout profile selected</option>
              {matchingPayoutProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.receiver_name}
                  {profile.account_number ? ` · ${profile.account_number}` : ""}
                </option>
              ))}
            </select>
            {state.fieldErrors?.payoutProfileId?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.payoutProfileId[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Amount remitted"
            name="amountRemitted"
            type="number"
            min="1"
            step="0.01"
            defaultValue={selectedSummary?.pendingBalance ?? ""}
            error={state.fieldErrors?.amountRemitted?.[0]}
            required
          />

          <Input
            label="Remittance date"
            name="remittanceDate"
            type="date"
            defaultValue={getTodayDateValue()}
            error={state.fieldErrors?.remittanceDate?.[0]}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Period start"
              name="periodStart"
              type="date"
              error={state.fieldErrors?.periodStart?.[0]}
            />

            <Input
              label="Period end"
              name="periodEnd"
              type="date"
              error={state.fieldErrors?.periodEnd?.[0]}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manager-remittance-method"
              className="text-sm font-bold text-text-strong"
            >
              Payment method
            </label>
            <select
              id="manager-remittance-method"
              name="paymentMethod"
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              defaultValue="bank_transfer"
              required
            >
              {MANAGER_REMITTANCE_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.paymentMethod?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.paymentMethod[0]}
              </p>
            ) : null}
          </div>

          <Input
            label="Payment reference"
            name="paymentReference"
            placeholder="Transfer reference or narration"
            error={state.fieldErrors?.paymentReference?.[0]}
          />

          <Input
            label="Proof URL"
            name="proofUrl"
            type="url"
            placeholder="Optional link to transfer proof"
            error={state.fieldErrors?.proofUrl?.[0]}
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-remittance-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-remittance-notes"
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
            Record Remittance
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
