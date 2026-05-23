"use client";

import { useActionState } from "react";
import { emailPasswordRegisterAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function EmailRegisterForm() {
  const [state, formAction, isPending] = useActionState(
    emailPasswordRegisterAction,
    initialAuthActionState,
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
            label="Full name"
            name="fullName"
            placeholder="Enter your full name"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

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
            placeholder="Create a secure password"
            autoComplete="new-password"
            error={state.fieldErrors?.password?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Create Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
