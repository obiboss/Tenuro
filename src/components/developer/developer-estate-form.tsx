"use client";

import { useActionState, useState } from "react";
import { createDeveloperEstateAction } from "@/actions/developer-estates.actions";
import { initialDeveloperEstateActionState } from "@/actions/developer-estates.state";
import { NIGERIA_STATES_LGAS } from "@/server/constants/nigeria-states-lgas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const estateStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "selling", label: "Selling" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "archived", label: "Archived" },
] as const;

export function DeveloperEstateForm() {
  const [selectedState, setSelectedState] = useState("");
  const selectedStateData = NIGERIA_STATES_LGAS.find(
    (item) => item.state === selectedState,
  );

  const [state, formAction, isPending] = useActionState(
    createDeveloperEstateAction,
    initialDeveloperEstateActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-5">
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
              Create the estate record first. BOPA will use the estate payment
              rule for every buyer purchase link under this estate.
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
              Set this once for the estate. When you start a buyer purchase,
              BOPA will calculate the first payment automatically from the plot
              price.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Input
                label="How much should buyers pay first?"
                name="initialPaymentPercentage"
                type="number"
                min="1"
                max="100"
                step="0.01"
                defaultValue="25"
                error={state.fieldErrors?.initialPaymentPercentage?.[0]}
                required
              />

              <Input
                label="Spread the balance over how many months?"
                name="balanceSpreadMonths"
                type="number"
                min="0"
                max="120"
                step="1"
                defaultValue="12"
                error={state.fieldErrors?.balanceSpreadMonths?.[0]}
                required
              />
            </div>

            <div className="mt-4 rounded-button bg-white px-4 py-3 text-sm font-bold leading-6 text-text-muted">
              Example: if a plot costs ₦5,000,000 and first payment is 25%, BOPA
              will require ₦1,250,000 first, then spread the remaining
              ₦3,750,000 across the months you entered.
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Create Estate
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
