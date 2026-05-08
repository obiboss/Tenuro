"use client";

import { useActionState } from "react";
import { verifyLandlordPropertyListingAction } from "@/actions/agent-property-listings.actions";
import { initialPublicLandlordVerificationActionState } from "@/actions/agent-property-listings.state";
import { Button } from "@/components/ui/button";

type PublicLandlordVerificationFormProps = {
  token: string;
};

export function PublicLandlordVerificationForm({
  token,
}: PublicLandlordVerificationFormProps) {
  const [state, formAction, isPending] = useActionState(
    verifyLandlordPropertyListingAction,
    initialPublicLandlordVerificationActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success"
              : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
          }
        >
          {state.message}
        </div>
      ) : null}

      <Button type="submit" isLoading={isPending} disabled={state.ok} fullWidth>
        {state.ok ? "Property Verified" : "Confirm This Property"}
      </Button>
    </form>
  );
}
