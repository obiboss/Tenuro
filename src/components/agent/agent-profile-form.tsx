"use client";

import { useActionState } from "react";
import { setupAgentProfileAction } from "@/actions/agent-profile.actions";
import { initialAgentProfileActionState } from "@/actions/agent-profile.state";
import type { AgentProfileRow } from "@/server/repositories/agent-profile.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AgentProfileFormProps = {
  profile: AgentProfileRow | null;
  agentPhoneNumber: string | null;
};

export function AgentProfileForm({
  profile,
  agentPhoneNumber,
}: AgentProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    setupAgentProfileAction,
    initialAgentProfileActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Agent profile saved"
        errorTitle="Agent profile failed"
      />

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
        label="Agency / Business name"
        name="businessName"
        defaultValue={profile?.business_name ?? ""}
        placeholder="Example: Ade Homes Agency"
        error={state.fieldErrors?.businessName?.[0]}
        required
      />

      <Input
        label="Business phone number"
        name="businessPhone"
        defaultValue={profile?.business_phone ?? agentPhoneNumber ?? ""}
        placeholder="080..."
        error={state.fieldErrors?.businessPhone?.[0]}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Service state"
          name="serviceState"
          defaultValue={profile?.service_state ?? ""}
          placeholder="Lagos"
          error={state.fieldErrors?.serviceState?.[0]}
          required
        />

        <Input
          label="Service LGA"
          name="serviceLga"
          defaultValue={profile?.service_lga ?? ""}
          placeholder="Ikeja"
          error={state.fieldErrors?.serviceLga?.[0]}
          required
        />
      </div>

      <Textarea
        label="Business address"
        name="businessAddress"
        defaultValue={profile?.business_address ?? ""}
        placeholder="Office address or operating base"
        error={state.fieldErrors?.businessAddress?.[0]}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Save Agent Profile
      </Button>
    </form>
  );
}
