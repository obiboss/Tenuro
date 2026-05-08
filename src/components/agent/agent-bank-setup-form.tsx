"use client";

import { useActionState, useMemo, useState } from "react";
import { setupAgentBankAccountAction } from "@/actions/agent-profile.actions";
import { initialAgentBankSetupActionState } from "@/actions/agent-profile.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type AgentBankSetupFormProps = {
  banks: {
    label: string;
    value: string;
  }[];
  defaultBusinessName: string;
  disabled?: boolean;
};

export function AgentBankSetupForm({
  banks,
  defaultBusinessName,
  disabled = false,
}: AgentBankSetupFormProps) {
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const selectedBankName = useMemo(() => {
    return banks.find((bank) => bank.value === selectedBankCode)?.label ?? "";
  }, [banks, selectedBankCode]);

  const [state, formAction, isPending] = useActionState(
    setupAgentBankAccountAction,
    initialAgentBankSetupActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Payout account connected"
        errorTitle="Payout setup failed"
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
        label="Business name for Paystack"
        name="businessName"
        defaultValue={defaultBusinessName}
        placeholder="Agency or business name"
        error={state.fieldErrors?.businessName?.[0]}
        disabled={disabled}
        required
      />

      <input type="hidden" name="bankName" value={selectedBankName} />

      <Select
        label="Bank"
        name="bankCode"
        options={banks}
        value={selectedBankCode}
        onChange={(event) => setSelectedBankCode(event.target.value)}
        error={
          state.fieldErrors?.bankCode?.[0] ?? state.fieldErrors?.bankName?.[0]
        }
        disabled={disabled}
        required
      />

      <Input
        label="Account number"
        name="accountNumber"
        inputMode="numeric"
        maxLength={10}
        placeholder="10-digit account number"
        error={state.fieldErrors?.accountNumber?.[0]}
        disabled={disabled}
        required
      />

      <Button type="submit" isLoading={isPending} disabled={disabled} fullWidth>
        Connect Agent Payout Account
      </Button>
    </form>
  );
}
