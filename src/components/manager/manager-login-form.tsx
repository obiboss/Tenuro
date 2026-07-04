"use client";

import { useActionState } from "react";
import { managerLoginAction } from "@/actions/manager-auth.actions";
import { initialManagerAuthActionState } from "@/actions/manager-auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManagerLoginForm() {
  const [state, formAction, isPending] = useActionState(
    managerLoginAction,
    initialManagerAuthActionState,
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
            label="Work email address"
            name="email"
            type="email"
            placeholder="you@firm.com"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={state.fieldErrors?.password?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Sign in to BOPA Manager
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
