"use client";

import { useActionState, useMemo, useState } from "react";
import { saveManagerOrganizationPaystackAccountAction } from "@/actions/manager-paystack-accounts.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrustNotice } from "@/components/ui/trust-notice";

type BankOption = {
  label: string;
  value: string;
};

type ManagerPaystackAccountFormProps = {
  banks: BankOption[];
  defaultBusinessName: string;
};

export function ManagerPaystackAccountForm({
  banks,
  defaultBusinessName,
}: ManagerPaystackAccountFormProps) {
  const [selectedBankCode, setSelectedBankCode] = useState("");

  const [state, formAction, isPending] = useActionState(
    saveManagerOrganizationPaystackAccountAction,
    initialManagerActionState,
  );

  const selectedBankName = useMemo(() => {
    return banks.find((bank) => bank.value === selectedBankCode)?.label ?? "";
  }, [banks, selectedBankCode]);

  return (
    <form id="manager-payout-account" action={formAction}>
      <Card>
        <CardContent>
          <TrustNotice
            title="Bank details are verified before saving"
            description="BOPA confirms the bank account with Paystack before saving it. Rent payment links become available after payout verification is approved."
          />

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
            label="Business name"
            name="businessName"
            defaultValue={defaultBusinessName}
            placeholder="Example: Akachukwu Properties"
            error={state.fieldErrors?.businessName?.[0]}
            required
          />

          <Select
            label="Bank"
            name="bankCode"
            placeholder="Select bank"
            options={banks}
            value={selectedBankCode}
            onChange={(event) => setSelectedBankCode(event.target.value)}
            error={state.fieldErrors?.bankCode?.[0]}
            required
          />

          <input type="hidden" name="bankName" value={selectedBankName} />

          <Input
            label="Account number"
            name="accountNumber"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit account number"
            error={state.fieldErrors?.accountNumber?.[0]}
            required
          />

          <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-normal">
            After submitting your bank details, Paystack verification may take
            up to 24 hours. Rent payment links will only work after this account
            is verified.
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Verify and Save Bank Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
