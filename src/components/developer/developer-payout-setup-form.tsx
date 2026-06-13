"use client";

import { useActionState, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { setupDeveloperPayoutAccountAction } from "@/actions/developer-payout.actions";
import { initialDeveloperPayoutSetupActionState } from "@/actions/developer-payout.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";

type BankOption = {
  label: string;
  value: string;
};

type DeveloperPayoutSetupFormProps = {
  banks: BankOption[];
};

export function DeveloperPayoutSetupForm({
  banks,
}: DeveloperPayoutSetupFormProps) {
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [state, formAction, isPending] = useActionState(
    setupDeveloperPayoutAccountAction,
    initialDeveloperPayoutSetupActionState,
  );

  const selectedBankName = useMemo(() => {
    return banks.find((bank) => bank.value === selectedBankCode)?.label ?? "";
  }, [banks, selectedBankCode]);

  return (
    <form action={formAction} className="space-y-5">
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

      <TrustNotice
        title="Payout verification required"
        description="BOPA confirms your bank account with Paystack first. After submission, platform admin must verify the payout account before buyer purchase links can be sent."
        icon={<CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <input type="hidden" name="bankName" value={selectedBankName} />

      <div className="space-y-2">
        <label
          htmlFor="bankCode"
          className="block text-sm font-semibold text-text-strong"
        >
          Bank <span className="ml-1 text-danger">*</span>
        </label>

        <select
          id="bankCode"
          name="bankCode"
          required
          value={selectedBankCode}
          onChange={(event) => setSelectedBankCode(event.target.value)}
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        >
          <option value="">Select bank</option>
          {banks.map((bank) => (
            <option key={bank.value} value={bank.value}>
              {bank.label}
            </option>
          ))}
        </select>

        {state.fieldErrors?.bankCode?.[0] ||
        state.fieldErrors?.bankName?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.bankCode?.[0] ?? state.fieldErrors.bankName?.[0]}
          </p>
        ) : null}
      </div>

      <Input
        label="Account number"
        name="accountNumber"
        inputMode="numeric"
        minLength={10}
        maxLength={10}
        placeholder="0123456789"
        error={state.fieldErrors?.accountNumber?.[0]}
        required
      />

      <div className="rounded-button bg-background px-4 py-3 text-sm font-semibold leading-6 text-text-muted">
        Developer can continue creating estates, plots, buyers, and schedules.
        Buyer purchase links only become available after this payout account is
        verified by BOPA admin.
      </div>

      <Button type="submit" isLoading={isPending}>
        Submit Payout Account
      </Button>
    </form>
  );
}
