"use client";

import { useActionState } from "react";
import { acceptDeveloperStaffRoleLinkAction } from "@/actions/developer-staff.actions";
import { initialDeveloperStaffAcceptActionState } from "@/actions/developer-staff.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DeveloperStaffInviteAcceptanceFormProps = {
  token: string;
  staffTitleLabel: string;
};

export function DeveloperStaffInviteAcceptanceForm({
  token,
  staffTitleLabel,
}: DeveloperStaffInviteAcceptanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    acceptDeveloperStaffRoleLinkAction,
    initialDeveloperStaffAcceptActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      <Card>
        <CardContent className="space-y-5">
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

          <div className="rounded-card bg-primary-soft p-5">
            <p className="font-black text-text-strong">
              Complete your BOPA staff account
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              You are joining as {staffTitleLabel}. Enter your details and
              create your password.
            </p>
          </div>

          <Input
            label="Full name"
            name="fullName"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Phone number"
            name="phoneNumber"
            type="tel"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.email?.[0]}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Password"
              name="password"
              type="password"
              error={state.fieldErrors?.password?.[0]}
              required
            />

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              error={state.fieldErrors?.confirmPassword?.[0]}
              required
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Create Staff Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
