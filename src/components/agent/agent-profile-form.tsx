"use client";

import { useActionState, useMemo, useState } from "react";
import { setupAgentProfileAction } from "@/actions/agent-profile.actions";
import { initialAgentProfileActionState } from "@/actions/agent-profile.state";
import type { AgentProfileRow } from "@/server/repositories/agent-profile.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getNigeriaLgaOptions,
  getNigeriaStateOptions,
} from "@/lib/nigeria-state-lga";

type AgentProfileFormProps = {
  profile: AgentProfileRow | null;
  agentPhoneNumber: string | null;
};

export function AgentProfileForm({
  profile,
  agentPhoneNumber,
}: AgentProfileFormProps) {
  const [selectedState, setSelectedState] = useState(profile?.service_state ?? "");
  const [selectedLga, setSelectedLga] = useState(profile?.service_lga ?? "");

  const [state, formAction, isPending] = useActionState(
    setupAgentProfileAction,
    initialAgentProfileActionState,
  );

  const stateOptions = useMemo(() => getNigeriaStateOptions(), []);

  const lgaOptions = useMemo(
    () => getNigeriaLgaOptions(selectedState),
    [selectedState],
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
        <Select
          label="Service state"
          name="serviceState"
          placeholder="Select state"
          options={stateOptions}
          value={selectedState}
          onChange={(event) => {
            setSelectedState(event.target.value);
            setSelectedLga("");
          }}
          error={state.fieldErrors?.serviceState?.[0]}
          required
        />

        <Select
          label="Service LGA"
          name="serviceLga"
          placeholder={selectedState ? "Select LGA" : "Select state first"}
          options={lgaOptions}
          value={selectedLga}
          onChange={(event) => setSelectedLga(event.target.value)}
          disabled={!selectedState}
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
