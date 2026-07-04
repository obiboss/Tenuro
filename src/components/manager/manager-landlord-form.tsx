"use client";

import { useActionState } from "react";
import { createManagerLandlordClientAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManagerLandlordForm() {
  const [state, formAction, isPending] = useActionState(
    createManagerLandlordClientAction,
    initialManagerActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Add landlord client
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Add the property owner your company manages property for.
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

          <Input
            label="Landlord Client"
            name="landlordName"
            placeholder="Example: Mr Chinedu Okeke"
            autoComplete="name"
            error={state.fieldErrors?.landlordName?.[0]}
            required
          />

          <Input
            label="Phone number"
            name="landlordPhone"
            placeholder="Example: 08012345678"
            autoComplete="tel"
            error={state.fieldErrors?.landlordPhone?.[0]}
          />

          <Input
            label="Email address"
            name="landlordEmail"
            type="email"
            placeholder="landlord@example.com"
            autoComplete="email"
            error={state.fieldErrors?.landlordEmail?.[0]}
          />

          <Input
            label="Address"
            name="landlordAddress"
            placeholder="Landlord address"
            autoComplete="street-address"
            error={state.fieldErrors?.landlordAddress?.[0]}
          />

          <div className="space-y-2">
            <label
              htmlFor="manager-landlord-notes"
              className="text-sm font-bold text-text-strong"
            >
              Notes
            </label>
            <textarea
              id="manager-landlord-notes"
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
            Add Landlord Client
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
