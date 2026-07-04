"use client";

import { useActionState } from "react";
import { saveManagerOrganizationPaystackAccountAction } from "@/actions/manager-paystack-accounts.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ManagerPaystackAccountFormProps = {
  organizationName: string;
};

export function ManagerPaystackAccountForm({
  organizationName,
}: ManagerPaystackAccountFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveManagerOrganizationPaystackAccountAction,
    initialManagerActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Manager payout account
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              This is the account used when the manager receives rent or
              management fees online.
            </p>
          </div>

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
            defaultValue={organizationName}
            error={state.fieldErrors?.businessName?.[0]}
            required
          />

          <Input
            label="Contact name"
            name="contactName"
            placeholder="Person responsible for this account"
            error={state.fieldErrors?.contactName?.[0]}
            required
          />

          <Input
            label="Contact phone"
            name="contactPhone"
            placeholder="080..."
            error={state.fieldErrors?.contactPhone?.[0]}
            required
          />

          <Input
            label="Contact email"
            name="contactEmail"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.contactEmail?.[0]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Bank name"
              name="bankName"
              placeholder="Example: GTBank"
              error={state.fieldErrors?.bankName?.[0]}
              required
            />

            <Input
              label="Bank code"
              name="bankCode"
              placeholder="Example: 058"
              error={state.fieldErrors?.bankCode?.[0]}
              required
            />
          </div>

          <Input
            label="Account number"
            name="accountNumber"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digit account number"
            error={state.fieldErrors?.accountNumber?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Save Manager Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
