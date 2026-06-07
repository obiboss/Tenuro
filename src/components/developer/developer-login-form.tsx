"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { developerLoginAction } from "@/actions/developer-auth.actions";
import { initialDeveloperAuthActionState } from "@/actions/developer-auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function DeveloperLoginForm() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [state, formAction, isPending] = useActionState(
    developerLoginAction,
    initialDeveloperAuthActionState,
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
            New developer?{" "}
            <Link href="/developer/register" className="font-bold text-primary">
              Create account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
