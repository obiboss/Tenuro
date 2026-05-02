"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerLandlordAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const [phoneNumber, setPhoneNumber] = useState("");

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

          <PhoneNumberInput
            label="Phone number"
            name="phoneNumber"
            value={phoneNumber}
            onChange={setPhoneNumber}
            error={state.fieldErrors?.phoneNumber?.[0]}
            helperText="Enter your number without the first 0. Example: 8149761904."
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
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
