"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { developerLoginAction } from "@/actions/developer-auth.actions";
import { initialDeveloperAuthActionState } from "@/actions/developer-auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PASSWORD_UPDATED_MESSAGE =
  "Password changed successfully. Sign in with your new password.";

type DeveloperLoginFormProps = {
  passwordUpdated?: boolean;
};

export function DeveloperLoginForm({
  passwordUpdated = false,
}: DeveloperLoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [state, formAction, isPending] = useActionState(
    developerLoginAction,
    initialDeveloperAuthActionState,
  );

  useEffect(() => {
    if (!passwordUpdated) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("passwordUpdated");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [passwordUpdated]);

  const statusMessage = state.message
    ? state.message
    : passwordUpdated
      ? PASSWORD_UPDATED_MESSAGE
      : "";
  const statusOk = state.message ? state.ok : passwordUpdated;

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          {statusMessage ? (
            <div
              role="alert"
              className={
                statusOk
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {statusMessage}
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

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={state.fieldErrors?.password?.[0]}
              required
            />

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-primary hover:text-primary-hover"
              >
                Forgot password?
              </Link>
            </div>
          </div>
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
