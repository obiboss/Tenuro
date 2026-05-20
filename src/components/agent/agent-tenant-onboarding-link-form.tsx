"use client";

import { useActionState, useEffect } from "react";
import { createAgentTenantOnboardingLinkAction } from "@/actions/agent-tenant-onboarding.actions";
import { initialAgentTenantOnboardingActionState } from "@/actions/agent-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AgentTenantOnboardingLinkFormProps = {
  listingId: string;
  disabled?: boolean;
};

export function AgentTenantOnboardingLinkForm({
  listingId,
  disabled = false,
}: AgentTenantOnboardingLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAgentTenantOnboardingLinkAction,
    initialAgentTenantOnboardingActionState,
  );

  useEffect(() => {
    if (!state.ok || !state.whatsappUrl) {
      return;
    }

    window.location.href = state.whatsappUrl;
  }, [state.ok, state.whatsappUrl]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="listingId" value={listingId} />

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

      <Input
        label="Tenant full name"
        name="fullName"
        placeholder="Enter tenant name"
        error={state.fieldErrors?.fullName?.[0]}
        disabled={disabled}
        required
      />

      <Input
        label="Tenant phone number"
        name="phoneNumber"
        placeholder="080..."
        error={state.fieldErrors?.phoneNumber?.[0]}
        disabled={disabled}
        required
      />

      <Input
        label="Tenant email"
        name="email"
        type="email"
        placeholder="Optional"
        error={state.fieldErrors?.email?.[0]}
        disabled={disabled}
      />

      <Textarea
        label="Internal note"
        name="note"
        placeholder="Optional note for the landlord record"
        error={state.fieldErrors?.note?.[0]}
        disabled={disabled}
      />

      <Button type="submit" isLoading={isPending} disabled={disabled} fullWidth>
        Send Tenant Onboarding Link
      </Button>
    </form>
  );
}
