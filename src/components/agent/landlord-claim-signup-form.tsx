"use client";

import { useActionState } from "react";
import { completeLandlordClaimSignupAction } from "@/actions/agent-property-listings.actions";
import { initialLandlordClaimSignupActionState } from "@/actions/agent-property-listings.state";
import type { AgentPropertyListingRow } from "@/server/repositories/agent-property-listings.repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LandlordClaimSignupFormProps = {
  token: string;
  listing: AgentPropertyListingRow;
};

export function LandlordClaimSignupForm({
  token,
  listing,
}: LandlordClaimSignupFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeLandlordClaimSignupAction,
    initialLandlordClaimSignupActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Input
        label="Full name"
        name="fullNamePreview"
        value={listing.landlord_full_name}
        readOnly
        helperText="This was confirmed during property approval."
      />

      <Input
        label="Phone number"
        name="phoneNumberPreview"
        value={listing.landlord_phone_number}
        readOnly
        helperText="This phone number will be used to sign in."
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

      <Button type="submit" isLoading={isPending} fullWidth>
        Create Account And Add More Units
      </Button>
    </form>
  );
}
