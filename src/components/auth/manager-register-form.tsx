"use client";

import { useActionState } from "react";
import { registerManagerAction } from "@/actions/manager-auth.actions";
import { initialManagerAuthActionState } from "@/actions/manager-auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManagerRegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerManagerAction,
    initialManagerAuthActionState,
  );

  const isSuccessful = state.ok;
  const isLocked = isPending || isSuccessful;

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
            label="Your name"
            name="fullName"
            placeholder="Example: Ada Okafor"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            disabled={isLocked}
            required
          />

          <Input
            label="Property management business name"
            name="organizationName"
            placeholder="Example: Prime Estate Managers"
            autoComplete="organization"
            error={state.fieldErrors?.organizationName?.[0]}
            disabled={isLocked}
            required
          />

          <Input
            label="Work email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
            disabled={isLocked}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Create a secure password"
            autoComplete="new-password"
            error={state.fieldErrors?.password?.[0]}
            disabled={isLocked}
            required
          />

          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword?.[0]}
            disabled={isLocked}
            required
          />
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={isLocked}
            fullWidth
          >
            {isSuccessful ? "Check your email" : "Create manager account"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
