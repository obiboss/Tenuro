"use client";

import { useActionState, useEffect } from "react";
import { createLandlordVerificationLinkAction } from "@/actions/agent-property-listings.actions";
import { initialAgentLandlordVerificationActionState } from "@/actions/agent-property-listings.state";
import { Button } from "@/components/ui/button";

type LandlordVerificationLinkFormProps = {
  listingId: string;
  disabled?: boolean;
};

export function LandlordVerificationLinkForm({
  listingId,
  disabled = false,
}: LandlordVerificationLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    createLandlordVerificationLinkAction,
    initialAgentLandlordVerificationActionState,
  );

  useEffect(() => {
    if (!state.ok || !state.whatsappUrl) {
      return;
    }

    window.location.href = state.whatsappUrl;
  }, [state.ok, state.whatsappUrl]);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="listingId" value={listingId} />

        <Button
          type="submit"
          size="sm"
          variant="secondary"
          isLoading={isPending}
          disabled={disabled}
          fullWidth
        >
          Send Verification Link
        </Button>
      </form>

      {state.message ? (
        <div
          role="alert"
          className={
            state.ok
              ? "rounded-button bg-success-soft px-3 py-2 text-xs font-semibold leading-5 text-success"
              : "rounded-button bg-danger-soft px-3 py-2 text-xs font-semibold leading-5 text-danger"
          }
        >
          {state.ok
            ? "Opening WhatsApp with the landlord verification message."
            : state.message}
        </div>
      ) : null}
    </div>
  );
}
