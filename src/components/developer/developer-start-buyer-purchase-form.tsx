"use client";

import { useActionState, useMemo, useState } from "react";
import { startDeveloperBuyerPurchaseAction } from "@/actions/developer-buyer-purchase.actions";
import { initialDeveloperBuyerPurchaseActionState } from "@/actions/developer-buyer-purchase.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNairaCompact } from "@/lib/money/naira";
import type { DeveloperPlotRow } from "@/server/repositories/developer-plots.repository";

type DeveloperStartBuyerPurchaseFormProps = {
  estateId: string;
  plots: DeveloperPlotRow[];
  preselectedPlotId?: string;
};

const paymentPlanOptions = [
  { value: "outright", label: "Full payment" },
  { value: "fixed_installment", label: "Fixed installment" },
  { value: "flexible", label: "Flexible payment" },
] as const;

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
  const [paymentPlanMode, setPaymentPlanMode] =
    useState<(typeof paymentPlanOptions)[number]["value"]>("fixed_installment");
  const [customFirstPaymentAmount, setCustomFirstPaymentAmount] = useState("");

  const effectiveSelectedPlotId = selectedPlotId || preselectedPlotId;

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === effectiveSelectedPlotId) ?? null,
    [plots, effectiveSelectedPlotId],
  );

  const firstPaymentAmount = useMemo(() => {
    if (!selectedPlot) {
      return customFirstPaymentAmount;
    }

    if (paymentPlanMode === "outright") {
      return String(Number(selectedPlot.price));
    }

    return customFirstPaymentAmount;
  }, [customFirstPaymentAmount, paymentPlanMode, selectedPlot]);

  function handlePlotChange(plotId: string) {
    setSelectedPlotId(plotId);

    const plot = plots.find((item) => item.id === plotId);

    if (!plot) {
      return;
    }

    if (paymentPlanMode === "outright") {
      return;
    }

    setCustomFirstPaymentAmount(String(Number(plot.price) * 0.3));
  }

  function handlePaymentPlanChange(
    mode: (typeof paymentPlanOptions)[number]["value"],
  ) {
    setPaymentPlanMode(mode);

    if (!selectedPlot) {
      return;
    }

    if (mode === "outright") {
      return;
    }

    if (!customFirstPaymentAmount) {
      setCustomFirstPaymentAmount(String(Number(selectedPlot.price) * 0.3));
    }
  }

  const canStart = plots.length > 0;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="estateId" value={estateId} />

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

      {state.purchaseUrl ? (
        <div className="space-y-3 rounded-button bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Buyer purchase link</p>
          <p className="break-all text-sm font-semibold leading-6 text-text-strong">
            {state.purchaseUrl}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(state.purchaseUrl ?? "");
              }}
            >
              Copy link
            </Button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hello, use this secure link to complete your plot purchase on Boldverse Property: ${state.purchaseUrl}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
            >
              Send buyer link
            </a>
          </div>
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
          onChange={(event) => handlePlotChange(event.target.value)}
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

      <div className="space-y-2">
        <label
          htmlFor="paymentPlanMode"
          className="block text-sm font-semibold text-text-strong"
        >
          Payment option <span className="ml-1 text-danger">*</span>
        </label>

        <select
          id="paymentPlanMode"
          name="paymentPlanMode"
          required
          value={paymentPlanMode}
          onChange={(event) =>
            handlePaymentPlanChange(
              event.target.value as (typeof paymentPlanOptions)[number]["value"],
            )
          }
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        >
          {paymentPlanOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {state.fieldErrors?.paymentPlanMode?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.paymentPlanMode[0]}
          </p>
        ) : null}
      </div>

      <Input
        label="First payment amount"
        name="firstPaymentAmount"
        type="number"
        min="1"
        step="0.01"
        value={firstPaymentAmount}
        onChange={(event) => setCustomFirstPaymentAmount(event.target.value)}
        required
        disabled={paymentPlanMode === "outright"}
        error={state.fieldErrors?.firstPaymentAmount?.[0]}
      />

      {selectedPlot ? (
        <div className="rounded-button bg-background p-4 text-sm font-semibold leading-6 text-text-muted">
          Total plot price: {formatNairaCompact(Number(selectedPlot.price))}
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
