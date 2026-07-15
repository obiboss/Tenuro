"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { managerLoginAction } from "@/actions/manager-auth.actions";
import { initialManagerAuthActionState } from "@/actions/manager-auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PASSWORD_UPDATED_MESSAGE =
  "Password changed successfully. Sign in with your new password.";

type ManagerLoginFormProps = {
  passwordUpdated?: boolean;
};

export function ManagerLoginForm({
  passwordUpdated = false,
}: ManagerLoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    managerLoginAction,
    initialManagerAuthActionState,
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

          <Input
            label="Work email address"
            name="email"
            type="email"
            placeholder="you@firm.com"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
            required
          />

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={state.fieldErrors?.password?.[0]}
              required
            />

            <div className="text-right">
              <Link
                href="/manager/forgot-password"
                className="text-sm font-bold text-primary hover:text-primary-hover"
              >
                Forgot password?
              </Link>
            </div>
          </div>
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
