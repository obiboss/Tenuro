"use client";

import { useActionState } from "react";
import { createTenancyAction } from "@/actions/tenancies.actions";
import { initialTenancyActionState } from "@/actions/tenancy.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenancyFormProps = {
  tenantId: string;
  unitId: string;
  defaultAnnualRent?: number | null;
};

const paymentFrequencyOptions = [
  { label: "Yearly / Annual", value: "annual" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Biannual", value: "biannual" },
];

export function TenancyForm({
  tenantId,
  unitId,
  defaultAnnualRent,
}: TenancyFormProps) {
  const [state, formAction, isPending] = useActionState(
    createTenancyAction,
    initialTenancyActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          <TrustNotice
            title="Create rental agreement"
            description="Set the yearly rent, agreement dates, opening balance, and renewal reminder for this tenant."
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

          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="unitId" value={unitId} />

          <CurrencyInput
            label="Yearly rent amount"
            name="rentAmount"
            defaultValue={defaultAnnualRent ?? null}
            placeholder="0.00"
            error={state.fieldErrors?.rentAmount?.[0]}
            helperText="Yearly rent is the default because most landlords in Lagos and major Nigerian cities collect rent annually."
            required
          />

          <Select
            label="Rent payment frequency"
            name="paymentFrequency"
            options={paymentFrequencyOptions}
            defaultValue="annual"
            error={state.fieldErrors?.paymentFrequency?.[0]}
            helperText="Keep as yearly unless this tenant is on a different payment arrangement."
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Start date"
              name="startDate"
              type="date"
              error={state.fieldErrors?.startDate?.[0]}
              required
            />

            <Input
              label="End date"
              name="endDate"
              type="date"
              error={state.fieldErrors?.endDate?.[0]}
              required
            />
          </div>

          <Input
            label="Renewal reminder date"
            name="renewalNoticeDate"
            type="date"
            helperText="Use a date before the rent expires so Tenuro can remind you later."
            error={state.fieldErrors?.renewalNoticeDate?.[0]}
          />

          <CurrencyInput
            label="Opening balance"
            name="openingBalance"
            defaultValue={0}
            placeholder="0.00"
            error={state.fieldErrors?.openingBalance?.[0]}
            helperText="Use this if the tenant already owes rent before this agreement starts."
          />

          <Textarea
            label="Opening balance note"
            name="openingBalanceNote"
            placeholder="Example: Balance carried over from previous rent period."
            error={state.fieldErrors?.openingBalanceNote?.[0]}
          />

          <Textarea
            label="Agreement note"
            name="agreementNotes"
            placeholder="Optional note about this rental agreement."
            error={state.fieldErrors?.agreementNotes?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Create Rental Agreement
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
