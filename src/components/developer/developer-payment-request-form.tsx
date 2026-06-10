"use client";

import { useActionState, useMemo, useState } from "react";
import { createDeveloperPaymentRequestAction } from "@/actions/developer-payments.actions";
import { initialDeveloperPaymentActionState } from "@/actions/developer-payments.state";
import {
  calculateDeveloperInstallmentFee,
  getDeveloperInstallmentFeePercentage,
} from "@/constants/developer-installment-fees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DeveloperPaymentScheduleItemRow } from "@/server/repositories/developer-payment-plans.repository";

type DeveloperPaymentRequestFormProps = {
  saleId: string;
  buyerEmail: string | null;
  outstandingBalance: number;
  scheduleItems: DeveloperPaymentScheduleItemRow[];
};

function getItemOutstanding(item: DeveloperPaymentScheduleItemRow) {
  return Math.max(0, Number(item.expected_amount) - Number(item.amount_paid));
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DeveloperPaymentRequestForm({
  saleId,
  buyerEmail,
  outstandingBalance,
  scheduleItems,
}: DeveloperPaymentRequestFormProps) {
  const pendingItems = scheduleItems.filter(
    (item) => getItemOutstanding(item) > 0,
  );

  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState(
    pendingItems[0]?.id ?? "",
  );

  const selectedItem = pendingItems.find(
    (item) => item.id === selectedScheduleItemId,
  );

  const [amount, setAmount] = useState(
    selectedItem ? String(getItemOutstanding(selectedItem)) : "",
  );

  const [state, formAction, isPending] = useActionState(
    createDeveloperPaymentRequestAction,
    initialDeveloperPaymentActionState,
  );

  const amountNumber = Number(amount);
  const safeAmount = Number.isFinite(amountNumber) ? amountNumber : 0;

  const fee = useMemo(
    () => calculateDeveloperInstallmentFee(safeAmount),
    [safeAmount],
  );

  const feePercentage = useMemo(
    () => getDeveloperInstallmentFeePercentage(safeAmount),
    [safeAmount],
  );

  const totalPayable = Number((safeAmount + fee.feeAmount).toFixed(2));

  function handleScheduleChange(value: string) {
    setSelectedScheduleItemId(value);

    const nextItem = pendingItems.find((item) => item.id === value);

    if (nextItem) {
      setAmount(String(getItemOutstanding(nextItem)));
      return;
    }

    setAmount("");
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="saleId" value={saleId} />

      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className={
                state.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success wrap-break-word"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {state.message}
            </div>
          ) : null}

          <div className="rounded-button bg-primary-soft p-4">
            <p className="text-sm font-bold text-primary">
              Outstanding Balance
            </p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {formatNaira(outstandingBalance)}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="scheduleItemId"
              className="block text-sm font-semibold text-text-strong"
            >
              Schedule item
            </label>

            <select
              id="scheduleItemId"
              name="scheduleItemId"
              value={selectedScheduleItemId}
              onChange={(event) => handleScheduleChange(event.target.value)}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            >
              <option value="">Custom payment</option>
              {pendingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — outstanding{" "}
                  {formatNaira(getItemOutstanding(item))}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Installment amount"
            name="amount"
            type="number"
            min="1"
            max={outstandingBalance}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={state.fieldErrors?.amount?.[0]}
            required
          />

          <Input
            label="Buyer email for Paystack"
            name="buyerEmail"
            type="email"
            defaultValue={buyerEmail ?? ""}
            placeholder="buyer@example.com"
            error={state.fieldErrors?.buyerEmail?.[0]}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Installment</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatNaira(safeAmount)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">
                Platform fee ({feePercentage}%)
              </p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatNaira(fee.feeAmount)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Buyer pays</p>
              <p className="mt-2 text-lg font-black text-text-strong">
                {formatNaira(totalPayable)}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={safeAmount <= 0 || safeAmount > outstandingBalance}
          >
            Create Payment Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
