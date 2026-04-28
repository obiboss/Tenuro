"use client";

import { useActionState, useMemo, useState } from "react";
import { setupLandlordBankAccountAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrustNotice } from "@/components/ui/trust-notice";

type BankOption = {
  label: string;
  value: string;
};

type BankSetupFormProps = {
  banks: BankOption[];
};

export function BankSetupForm({ banks }: BankSetupFormProps) {
  const [selectedBankCode, setSelectedBankCode] = useState("");

  const [state, formAction, isPending] = useActionState(
    setupLandlordBankAccountAction,
    initialPaymentActionState,
  );

  const selectedBankName = useMemo(() => {
    return banks.find((bank) => bank.value === selectedBankCode)?.label ?? "";
  }, [banks, selectedBankCode]);

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          <TrustNotice
            title="Bank details are verified before saving"
            description="Tenuro confirms the account with Paystack before creating your landlord payout setup."
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
            label="Business name"
            name="businessName"
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

          <div className="rounded-button bg-warning-soft p-4 text-sm leading-6 text-text-normal">
            Manual bank transfer payments will still be free to record. Tenuro
            only earns revenue when tenants pay through the gateway.
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
