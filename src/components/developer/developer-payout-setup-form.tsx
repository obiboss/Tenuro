"use client";

import { useActionState, useMemo, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { setupDeveloperPayoutAccountAction } from "@/actions/developer-payout.actions";
import { initialDeveloperPayoutSetupActionState } from "@/actions/developer-payout.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form action={formAction} className="space-y-6">
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

      <div className="rounded-card bg-primary-soft p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
            <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div>
            <p className="font-black text-text-strong">
              Your bank details are checked before approval
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              BOPA will confirm the account name with Paystack, then your payout
              account will wait for BOPA review. Buyer payment links become
              available after approval.
            </p>
          </div>
        </div>
      </div>

      <input type="hidden" name="bankName" value={selectedBankName} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="bankCode"
            className="block text-sm font-bold text-text-strong"
          >
            Bank <span className="ml-1 text-danger">*</span>
          </label>

          <select
            id="bankCode"
            name="bankCode"
            required
            value={selectedBankCode}
            onChange={(event) => setSelectedBankCode(event.target.value)}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
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
              {state.fieldErrors.bankCode?.[0] ??
                state.fieldErrors.bankName?.[0]}
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
      </div>

      <div className="rounded-card border border-border-soft bg-background p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
            <ShieldCheck aria-hidden="true" size={21} strokeWidth={2.6} />
          </div>

          <div>
            <p className="font-black text-text-strong">
              What you can still do while waiting
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              You can continue creating estates, plots, buyers, and sales. Only
              buyer payment links are locked until the account is approved.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          Save bank account for review
        </Button>
      </div>
    </form>
  );
}
