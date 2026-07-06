"use client";

import { useActionState } from "react";
import { createManagerOrganizationAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManagerOnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createManagerOrganizationAction,
    initialManagerActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="rcNumber" value="" />

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
            label="Business name"
            name="organizationName"
            placeholder="Example: Prime Estate Managers"
            autoComplete="organization"
            error={state.fieldErrors?.organizationName?.[0]}
            required
          />

          <Input
            label="Office phone"
            name="organizationPhone"
            placeholder="Example: 08012345678"
            autoComplete="tel"
            error={state.fieldErrors?.organizationPhone?.[0]}
          />

          <Input
            label="Office email"
            name="organizationEmail"
            type="email"
            placeholder="office@example.com"
            autoComplete="email"
            error={state.fieldErrors?.organizationEmail?.[0]}
          />

          <Input
            label="Office address"
            name="officeAddress"
            placeholder="Optional"
            autoComplete="street-address"
            error={state.fieldErrors?.officeAddress?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
