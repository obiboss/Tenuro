"use client";

import { useActionState, useMemo, useState } from "react";
import { createDeveloperPaymentPlanAction } from "@/actions/developer-payment-plans.actions";
import { initialDeveloperPaymentPlanActionState } from "@/actions/developer-payment-plans.state";
import type { DeveloperPaymentPlanMode } from "@/server/validators/developer-payment-plan.schema";
import { formatNaira } from "@/server/utils/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ScheduleItemDraft = {
  id: string;
  label: string;
  dueDate: string;
  expectedAmount: string;
};

type DeveloperPaymentPlanFormProps = {
  saleId: string;
  lockedSalePrice: number;
  initialMode: DeveloperPaymentPlanMode;
};

const paymentPlanModeOptions: {
  value: DeveloperPaymentPlanMode;
  label: string;
}[] = [
  { value: "outright", label: "Outright payment" },
  { value: "fixed_installment", label: "Fixed installment" },
  { value: "milestone_based", label: "Milestone-based" },
  { value: "flexible", label: "Flexible" },
];

function createScheduleItemDraft(index: number): ScheduleItemDraft {
  return {
    id: crypto.randomUUID(),
    label: index === 0 ? "Payment 1" : `Payment ${index + 1}`,
    dueDate: new Date().toISOString().slice(0, 10),
    expectedAmount: "",
  };
}

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DeveloperPaymentPlanForm({
  saleId,
  lockedSalePrice,
  initialMode,
}: DeveloperPaymentPlanFormProps) {
  const [paymentPlanMode, setPaymentPlanMode] =
    useState<DeveloperPaymentPlanMode>(initialMode);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemDraft[]>([
    {
      ...createScheduleItemDraft(0),
      label: "Full payment",
      expectedAmount: String(lockedSalePrice),
    },
  ]);

  const [state, formAction, isPending] = useActionState(
    createDeveloperPaymentPlanAction,
    initialDeveloperPaymentPlanActionState,
  );

  const scheduleTotal = useMemo(
    () =>
      scheduleItems.reduce(
        (total, item) => total + parseAmount(item.expectedAmount),
        0,
      ),
    [scheduleItems],
  );

  const balanceDifference = Number(
    (lockedSalePrice - scheduleTotal).toFixed(2),
  );
  const canSubmit = scheduleItems.length > 0 && balanceDifference === 0;

  const scheduleItemsJson = useMemo(
    () =>
      JSON.stringify(
        scheduleItems.map((item, index) => ({
          label: item.label,
          dueDate: item.dueDate,
          expectedAmount: parseAmount(item.expectedAmount),
          sortOrder: index,
        })),
      ),
    [scheduleItems],
  );

  function updateScheduleItem(
    itemId: string,
    field: keyof Omit<ScheduleItemDraft, "id">,
    value: string,
  ) {
    setScheduleItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addScheduleItem() {
    setScheduleItems((currentItems) => [
      ...currentItems,
      createScheduleItemDraft(currentItems.length),
    ]);
  }

  function removeScheduleItem(itemId: string) {
    setScheduleItems((currentItems) =>
      currentItems.length <= 1
        ? currentItems
        : currentItems.filter((item) => item.id !== itemId),
    );
  }

  function resetForOutright() {
    setPaymentPlanMode("outright");
    setScheduleItems([
      {
        ...createScheduleItemDraft(0),
        label: "Full payment",
        expectedAmount: String(lockedSalePrice),
      },
    ]);
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="saleId" value={saleId} />
      <input type="hidden" name="scheduleItemsJson" value={scheduleItemsJson} />

      <Card>
        <CardContent>
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

          <div className="rounded-button bg-primary-soft p-4">
            <p className="text-sm font-bold text-primary">Locked sale price</p>
            <p className="mt-2 text-2xl font-black text-text-strong">
              {formatNaira(lockedSalePrice)}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-primary">
              Schedule total must match this amount exactly.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="paymentPlanMode"
              className="block text-sm font-semibold text-text-strong"
            >
              Payment mode <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="paymentPlanMode"
              name="paymentPlanMode"
              required
              value={paymentPlanMode}
              onChange={(event) =>
                setPaymentPlanMode(
                  event.target.value as DeveloperPaymentPlanMode,
                )
              }
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            >
              {paymentPlanModeOptions.map((option) => (
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
            label="Schedule start date"
            name="scheduleStartDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            error={state.fieldErrors?.scheduleStartDate?.[0]}
            required
          />

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-text-strong">
                  Schedule Items
                </p>
                <p className="text-sm leading-6 text-text-muted">
                  These are expected payments, not actual payment records.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForOutright}
                >
                  Outright
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={addScheduleItem}
                >
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {scheduleItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-button border border-border-soft bg-white p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
                    <Input
                      label="Label"
                      value={item.label}
                      onChange={(event) =>
                        updateScheduleItem(item.id, "label", event.target.value)
                      }
                      required
                    />

                    <Input
                      label="Due date"
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        updateScheduleItem(
                          item.id,
                          "dueDate",
                          event.target.value,
                        )
                      }
                      required
                    />

                    <Input
                      label="Amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.expectedAmount}
                      onChange={(event) =>
                        updateScheduleItem(
                          item.id,
                          "expectedAmount",
                          event.target.value,
                        )
                      }
                      required
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={scheduleItems.length <= 1}
                      onClick={() => removeScheduleItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-text-muted">
                    Item {index + 1}
                  </p>
                </div>
              ))}
            </div>

            {state.fieldErrors?.scheduleItemsJson?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.scheduleItemsJson[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">
                Schedule Total
              </p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(scheduleTotal)}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-muted">Required</p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(lockedSalePrice)}
              </p>
            </div>

            <div
              className={
                balanceDifference === 0
                  ? "rounded-button bg-success-soft p-4"
                  : "rounded-button bg-warning-soft p-4"
              }
            >
              <p
                className={
                  balanceDifference === 0
                    ? "text-sm font-bold text-success"
                    : "text-sm font-bold text-warning"
                }
              >
                Difference
              </p>
              <p className="mt-2 text-xl font-black text-text-strong">
                {formatNaira(balanceDifference)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-semibold text-text-strong"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Optional payment plan note"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />

            {state.fieldErrors?.notes?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.notes[0]}
              </p>
            ) : null}
          </div>

          {!canSubmit ? (
            <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
              The schedule total must equal the locked sale price before this
              payment plan can be saved.
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} disabled={!canSubmit}>
            Save Payment Plan
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
