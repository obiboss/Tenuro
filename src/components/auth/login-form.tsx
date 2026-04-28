"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, initialAuthActionState } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {state.message}
            </div>
          ) : null}

          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            error={state.fieldErrors?.email?.[0]}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            error={state.fieldErrors?.password?.[0]}
            required
          />
        </CardContent>

        <CardFooter className="items-stretch">
          <Button type="submit" isLoading={isPending} fullWidth>
            Sign In
          </Button>

          <p className="text-center text-sm text-text-muted sm:text-left">
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
