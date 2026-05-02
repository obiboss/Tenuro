"use client";

import { useActionState, useState } from "react";
import { phonePasswordLoginAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";

type PhoneLoginFormProps = {
  purpose?: "login" | "register";
};

export function PhoneLoginForm({
  purpose: _purpose = "login",
}: PhoneLoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [state, formAction, isPending] = useActionState(
    phonePasswordLoginAction,
    initialAuthActionState,
  );

  return (
    <div className="space-y-5">
      <TrustNotice
        title="Sign in with phone and password"
        description="Use your registered phone number and password. No verification code is required for normal login."
      />

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

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isPending} fullWidth>
              Sign in
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
