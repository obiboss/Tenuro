"use client";

import { useActionState, useMemo, useState } from "react";
import { createDeveloperEstateAction } from "@/actions/developer-estates.actions";
import { initialDeveloperEstateActionState } from "@/actions/developer-estates.state";
import { DeveloperMoneyInput } from "@/components/developer/developer-money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/money/naira";
import { NIGERIA_STATES_LGAS } from "@/server/constants/nigeria-states-lgas";

const estateStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "selling", label: "Selling" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "archived", label: "Archived" },
] as const;

const numberingStyleOptions = [
  {
    value: "numeric",
    label: "Plot 1, Plot 2, Plot 3",
  },
  {
    value: "prefixed_numeric",
    label: "A1, A2, A3",
  },
  {
    value: "block_numeric",
    label: "Block A - Plot 1, Block A - Plot 2",
  },
] as const;

const initialPaymentOptions = ["10", "20", "25", "30", "50", "100"] as const;
const balanceMonthOptions = ["6", "12", "18", "24", "36", "48"] as const;

function cleanDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [firstPart, ...otherParts] = cleaned.split(".");

  return otherParts.length > 0
    ? `${firstPart}.${otherParts.join("")}`
    : firstPart;
}

function cleanIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function getSafePercentage(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(Math.max(parsed, 0), 100);
}

export function DeveloperEstateForm() {
  const [selectedState, setSelectedState] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [initialPaymentPercentage, setInitialPaymentPercentage] =
    useState("25");
  const [balanceSpreadMonths, setBalanceSpreadMonths] = useState("12");

  const selectedStateData = NIGERIA_STATES_LGAS.find(
    (item) => item.state === selectedState,
  );

  const [state, formAction, isPending] = useActionState(
    createDeveloperEstateAction,
    initialDeveloperEstateActionState,
  );

  const safeInitialPaymentPercentage = getSafePercentage(
    initialPaymentPercentage,
  );

  const effectiveBalanceSpreadMonths =
    safeInitialPaymentPercentage >= 100 ? "0" : balanceSpreadMonths;

  const example = useMemo(() => {
    const plotPrice = 5_000_000;
    const firstPayment = Number(
      ((plotPrice * safeInitialPaymentPercentage) / 100).toFixed(2),
    );
    const balance = Math.max(0, plotPrice - firstPayment);

    return {
      firstPayment,
      balance,
    };
  }, [safeInitialPaymentPercentage]);

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="initialPaymentPercentage"
        value={initialPaymentPercentage}
      />
      <input
        type="hidden"
        name="balanceSpreadMonths"
        value={effectiveBalanceSpreadMonths}
      />

      <Card>
        <CardContent className="space-y-6">
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

          <div className="rounded-card bg-primary-soft p-5">
            <p className="font-black text-text-strong">Estate details</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Create the estate, define how buyers will pay, then generate the
              plots that belong to this estate.
            </p>
          </div>

          <Input
            label="Estate name"
            name="estateName"
            placeholder="Greenfield Estate"
            error={state.fieldErrors?.estateName?.[0]}
            required
          />

          <Input
            label="Estate address / location"
            name="location"
            placeholder="Estate road, nearest landmark, area"
            error={state.fieldErrors?.location?.[0]}
            required
          />

          <Input
            label="City / Town"
            name="city"
            placeholder="Lekki"
            error={state.fieldErrors?.city?.[0]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="state"
                className="block text-sm font-semibold text-text-strong"
              >
                State / FCT <span className="ml-1 text-danger">*</span>
              </label>

              <select
                id="state"
                name="state"
                required
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              >
                <option value="">Select state</option>
                {NIGERIA_STATES_LGAS.map((item) => (
                  <option key={item.state} value={item.state}>
                    {item.state}
                  </option>
                ))}
              </select>

              {state.fieldErrors?.state?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.state[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lga"
                className="block text-sm font-semibold text-text-strong"
              >
                LGA <span className="ml-1 text-danger">*</span>
              </label>

              <select
                id="lga"
                name="lga"
                required
                disabled={!selectedStateData}
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted"
                defaultValue=""
              >
                <option value="">
                  {selectedStateData ? "Select LGA" : "Select state first"}
                </option>
                {selectedStateData?.lgas.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>

              {state.fieldErrors?.lga?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.lga[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-semibold text-text-strong"
            >
              Development status <span className="ml-1 text-danger">*</span>
            </label>

            <select
              id="status"
              name="status"
              required
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue="planning"
            >
              {estateStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {state.fieldErrors?.status?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.status[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-text-strong"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Optional estate description"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />

            {state.fieldErrors?.description?.[0] ? (
              <p className="text-sm font-medium text-danger">
                {state.fieldErrors.description[0]}
              </p>
            ) : null}
          </div>

          <div className="rounded-card border border-border-soft bg-background p-5">
            <p className="font-black text-text-strong">
              Default buyer payment plan
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Set this once. Every buyer purchase link under this estate will
              follow this rule.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-card border border-border-soft bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-text-strong">
                      First payment
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-text-muted">
                      Percentage of the plot price buyers must pay first.
                    </p>
                  </div>

                  <div className="rounded-full bg-primary-soft px-4 py-2 text-lg font-black text-primary">
                    {initialPaymentPercentage || "0"}%
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {initialPaymentOptions.map((option) => {
                    const active = initialPaymentPercentage === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setInitialPaymentPercentage(option)}
                        className={
                          active
                            ? "min-h-10 rounded-button bg-primary px-3 text-sm font-black text-white shadow-soft"
                            : "min-h-10 rounded-button bg-background px-3 text-sm font-black text-text-muted transition hover:bg-primary-soft hover:text-primary"
                        }
                      >
                        {option}%
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="customInitialPaymentPercentage"
                    className="text-xs font-black uppercase tracking-wide text-text-muted"
                  >
                    Custom percentage
                  </label>

                  <div className="mt-2 flex min-h-12 items-center rounded-button border border-border-soft bg-background px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft">
                    <input
                      id="customInitialPaymentPercentage"
                      type="text"
                      inputMode="decimal"
                      value={initialPaymentPercentage}
                      onChange={(event) =>
                        setInitialPaymentPercentage(
                          cleanDecimalInput(event.target.value),
                        )
                      }
                      className="w-full bg-transparent text-base font-black text-text-strong outline-none"
                    />
                    <span className="text-sm font-black text-text-muted">
                      %
                    </span>
                  </div>

                  {state.fieldErrors?.initialPaymentPercentage?.[0] ? (
                    <p className="mt-2 text-sm font-medium text-danger">
                      {state.fieldErrors.initialPaymentPercentage[0]}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-card border border-border-soft bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-text-strong">
                      Balance period
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-text-muted">
                      How long buyers have to complete the remaining balance.
                    </p>
                  </div>

                  <div className="rounded-full bg-primary-soft px-4 py-2 text-lg font-black text-primary">
                    {safeInitialPaymentPercentage >= 100
                      ? "None"
                      : `${balanceSpreadMonths || "0"}m`}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {balanceMonthOptions.map((option) => {
                    const active = balanceSpreadMonths === option;
                    const disabled = safeInitialPaymentPercentage >= 100;

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() => setBalanceSpreadMonths(option)}
                        className={
                          active && !disabled
                            ? "min-h-10 rounded-button bg-primary px-3 text-sm font-black text-white shadow-soft"
                            : "min-h-10 rounded-button bg-background px-3 text-sm font-black text-text-muted transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {option}m
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="customBalanceSpreadMonths"
                    className="text-xs font-black uppercase tracking-wide text-text-muted"
                  >
                    Custom months
                  </label>

                  <div className="mt-2 flex min-h-12 items-center rounded-button border border-border-soft bg-background px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft">
                    <input
                      id="customBalanceSpreadMonths"
                      type="text"
                      inputMode="numeric"
                      value={
                        safeInitialPaymentPercentage >= 100
                          ? "0"
                          : balanceSpreadMonths
                      }
                      disabled={safeInitialPaymentPercentage >= 100}
                      onChange={(event) =>
                        setBalanceSpreadMonths(
                          cleanIntegerInput(event.target.value),
                        )
                      }
                      className="w-full bg-transparent text-base font-black text-text-strong outline-none disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-black text-text-muted">
                      months
                    </span>
                  </div>

                  {state.fieldErrors?.balanceSpreadMonths?.[0] ? (
                    <p className="mt-2 text-sm font-medium text-danger">
                      {state.fieldErrors.balanceSpreadMonths[0]}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-button bg-white px-4 py-3 text-sm font-bold leading-6 text-text-muted">
              Example: if one plot costs ₦5,000,000, first payment will be{" "}
              {formatNaira(example.firstPayment)} and the remaining balance will
              be {formatNaira(example.balance)}.
            </div>
          </div>

          <div className="rounded-card border border-border-soft bg-background p-5">
            <p className="font-black text-text-strong">Plot generation</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              Enter the plot setup once. BOPA will create the plot list and
              labels immediately after the estate is created.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Input
                label="Total land size"
                name="landSize"
                placeholder="Example: 100 acres or 40 hectares"
                error={state.fieldErrors?.landSize?.[0]}
                required
              />

              <Input
                label="Number of plots to generate"
                name="numberOfPlots"
                type="number"
                min="1"
                max="500"
                step="1"
                placeholder="Example: 200"
                error={state.fieldErrors?.numberOfPlots?.[0]}
                required
              />

              <Input
                label="Size of each plot"
                name="plotSizeLabel"
                placeholder="Example: 500 sqm"
                error={state.fieldErrors?.plotSizeLabel?.[0]}
                required
              />

              <DeveloperMoneyInput
                label="Selling price per plot"
                value={priceDisplay}
                onChange={setPriceDisplay}
                hiddenInputName="pricePerPlot"
                required
                error={state.fieldErrors?.pricePerPlot?.[0]}
              />

              <div className="space-y-2">
                <label
                  htmlFor="numberingStyle"
                  className="block text-sm font-semibold text-text-strong"
                >
                  Plot label style <span className="ml-1 text-danger">*</span>
                </label>

                <select
                  id="numberingStyle"
                  name="numberingStyle"
                  required
                  defaultValue="numeric"
                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                >
                  {numberingStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {state.fieldErrors?.numberingStyle?.[0] ? (
                  <p className="text-sm font-medium text-danger">
                    {state.fieldErrors.numberingStyle[0]}
                  </p>
                ) : null}
              </div>

              <Input
                label="Starting number"
                name="startingNumber"
                type="number"
                min="1"
                step="1"
                defaultValue="1"
                error={state.fieldErrors?.startingNumber?.[0]}
                required
              />

              <Input
                label="Prefix, if needed"
                name="labelPrefix"
                placeholder="Example: A"
                error={state.fieldErrors?.labelPrefix?.[0]}
              />

              <Input
                label="Plots per block"
                name="plotsPerBlock"
                type="number"
                min="1"
                max="100"
                step="1"
                defaultValue="20"
                error={state.fieldErrors?.plotsPerBlock?.[0]}
                required
              />
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="plotNote"
                className="block text-sm font-semibold text-text-strong"
              >
                Plot note
              </label>

              <textarea
                id="plotNote"
                name="plotNote"
                rows={3}
                placeholder="Optional"
                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />

              {state.fieldErrors?.plotNote?.[0] ? (
                <p className="text-sm font-medium text-danger">
                  {state.fieldErrors.plotNote[0]}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Create Estate and Generate Plots
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
