"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  initialAuthActionState,
  registerLandlordAction,
} from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerLandlordAction,
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
            label="Full name"
            name="fullName"
            placeholder="Enter your full name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Phone number"
            name="phoneNumber"
            placeholder="Example: 08012345678"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

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
            placeholder="At least 8 characters"
            error={state.fieldErrors?.password?.[0]}
            required
          />
        </CardContent>

        <CardFooter className="items-stretch">
          <Button type="submit" isLoading={isPending} fullWidth>
            Create Account
          </Button>

          <p className="text-center text-sm text-text-muted sm:text-left">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
