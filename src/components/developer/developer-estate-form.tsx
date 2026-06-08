"use client";

import { useActionState } from "react";
import { createDeveloperEstateAction } from "@/actions/developer-estates.actions";
import { initialDeveloperEstateActionState } from "@/actions/developer-estates.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function DeveloperEstateForm() {
  const [state, formAction, isPending] = useActionState(
    createDeveloperEstateAction,
    initialDeveloperEstateActionState,
  );

  return (
    <form action={formAction}>
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

          <Input
            label="Estate name"
            name="estateName"
            placeholder="Greenfield Estate"
            error={state.fieldErrors?.estateName?.[0]}
            required
          />

          <Input
            label="Location"
            name="location"
            placeholder="Ibeju-Lekki, Lagos"
            error={state.fieldErrors?.location?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
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
              <option value="planning">Planning</option>
              <option value="selling">Selling</option>
              <option value="paused">Paused</option>
              <option value="sold_out">Sold out</option>
              <option value="archived">Archived</option>
            </select>
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
