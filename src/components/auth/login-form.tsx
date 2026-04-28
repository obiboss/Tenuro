"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emailPasswordLoginAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    emailPasswordLoginAction,
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
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={state.fieldErrors?.email?.[0]}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={state.fieldErrors?.password?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Sign in
          </Button>

          <p className="text-center text-sm text-text-muted">
            New to Tenuro?{" "}
            <Link href="/register" className="font-bold text-primary">
              Create account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
