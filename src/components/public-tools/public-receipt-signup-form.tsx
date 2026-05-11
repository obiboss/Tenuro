"use client";

import { useActionState } from "react";
import { createPublicReceiptLandlordAccountAction } from "@/actions/public-tool-onboarding.actions";
import { initialPublicReceiptSignupActionState } from "@/actions/public-tool-onboarding.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PublicReceiptSignupFormProps = {
  receiptId: string;
  token: string;
  fullName: string;
  phoneNumber: string;
  email: string;
};

export function PublicReceiptSignupForm({
  receiptId,
  token,
  fullName,
  phoneNumber,
  email,
}: PublicReceiptSignupFormProps) {
  const [state, formAction, isPending] = useActionState(
    createPublicReceiptLandlordAccountAction,
    initialPublicReceiptSignupActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="receiptId" value={receiptId} />
      <input type="hidden" name="token" value={token} />

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
            defaultValue={fullName}
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Phone number"
            name="phoneNumber"
            defaultValue={phoneNumber}
            autoComplete="tel"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

          <Input
            label="Email address optional"
            name="email"
            type="email"
            defaultValue={email}
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
          />

          <Input
            label="Create password"
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
            Create Free Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
