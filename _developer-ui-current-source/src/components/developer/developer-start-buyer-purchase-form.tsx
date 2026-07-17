"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { startDeveloperBuyerPurchaseAction } from "@/actions/developer-buyer-purchase.actions";
import { initialDeveloperBuyerPurchaseActionState } from "@/actions/developer-buyer-purchase.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import { formatNairaCompact } from "@/lib/money/naira";
import { buildDeveloperBuyerPurchaseWhatsappMessage } from "@/lib/whatsapp-messages";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperStartBuyerPurchaseFormProps = {
  estateId: string;
  plots: DeveloperPlotRow[];
  preselectedPlotId?: string;
};

function isPayoutSetupError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("payout bank account") ||
    normalizedMessage.includes("payout account")
  );
}

export function DeveloperStartBuyerPurchaseForm({
  estateId,
  plots,
  preselectedPlotId = "",
}: DeveloperStartBuyerPurchaseFormProps) {
  const [state, formAction, isPending] = useActionState(
    startDeveloperBuyerPurchaseAction,
    initialDeveloperBuyerPurchaseActionState,
  );
  const [selectedPlotId, setSelectedPlotId] = useState(preselectedPlotId);

  const effectiveSelectedPlotId = selectedPlotId || preselectedPlotId;

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === effectiveSelectedPlotId) ?? null,
    [plots, effectiveSelectedPlotId],
  );

  const showPayoutSettingsCta =
    Boolean(state.message) && !state.ok && isPayoutSetupError(state.message);

  const canStart = plots.length > 0;
  const purchaseMessage =
    state.purchaseUrl && state.companyName
      ? buildDeveloperBuyerPurchaseWhatsappMessage({
          buyerName: state.buyerName ?? "Buyer",
          companyName: state.companyName,
          purchaseUrl: state.purchaseUrl,
        })
      : "";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="estateId" value={estateId} />

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "space-y-3 rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
              : "space-y-3 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          }
        >
          <p>{state.message}</p>

          {showPayoutSettingsCta ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/developer?section=settings#payout-account"
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
              >
                Go to payout settings
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.purchaseUrl ? (
        <div className="space-y-3 rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">
            Buyer purchase link
          </p>
          <p className="break-all text-sm font-semibold leading-6 text-text-strong">
            {state.purchaseUrl}
          </p>

          <WhatsAppShareActions
            phoneNumber={state.buyerPhone ?? null}
            message={purchaseMessage}
            copyText={state.purchaseUrl ?? purchaseMessage}
            whatsappLabel="Send on WhatsApp"
            copyLabel="Copy link"
            compact
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="plotId"
          className="block text-sm font-semibold text-text-strong"
        >
          Choose plot <span className="ml-1 text-danger">*</span>
        </label>

        <select
          id="plotId"
          name="plotId"
          required
          disabled={plots.length === 0}
          value={effectiveSelectedPlotId}
          onChange={(event) => setSelectedPlotId(event.target.value)}
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
        >
          <option value="">
            {plots.length > 0 ? "Choose plot" : "No available plot yet"}
          </option>

          {plots.map((plot) => (
            <option key={plot.id} value={plot.id}>
              {plot.plot_number} — {plot.size_label} —{" "}
              {formatNairaCompact(Number(plot.price))}
            </option>
          ))}
        </select>

        {state.fieldErrors?.plotId?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.plotId[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Buyer phone number"
          name="buyerPhone"
          type="tel"
          placeholder="08012345678"
          required
          error={state.fieldErrors?.buyerPhone?.[0]}
        />

        <Input
          label="Buyer name"
          name="buyerName"
          placeholder="Optional"
          error={state.fieldErrors?.buyerName?.[0]}
        />
      </div>

      <Input
        label="Buyer email"
        name="buyerEmail"
        type="email"
        placeholder="Optional"
        error={state.fieldErrors?.buyerEmail?.[0]}
      />

      {selectedPlot ? (
        <div className="rounded-card bg-primary-soft p-4">
          <p className="font-black text-text-strong">
            Plot price: {formatNairaCompact(Number(selectedPlot.price))}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            BOPA will calculate the buyer’s first payment from the payment plan
            saved on this estate. The buyer cannot change the payment amount
            from the purchase link.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="note"
          className="block text-sm font-semibold text-text-strong"
        >
          Note
        </label>

        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Optional"
          className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
      </div>

      {!canStart ? (
        <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
          Add at least one available plot before starting a buyer purchase.
        </div>
      ) : null}

      {!state.purchaseUrl ? (
        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending} disabled={!canStart}>
            Reserve plot and create link
          </Button>
        </div>
      ) : null}
    </form>
  );
}
