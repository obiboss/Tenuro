"use client";

import { useActionState, useMemo, useState, type ChangeEvent } from "react";
import { createTenancyAction } from "@/actions/tenancies.actions";
import { initialTenancyActionState } from "@/actions/tenancy.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  calculateTenancyEndDate,
  formatDisplayDate,
  getTodayDateInputValue,
  type TenancyPaymentFrequency,
} from "@/lib/tenancy-period";

type TenancyFormProps = {
  tenantId: string;
  unitId: string;
  defaultAnnualRent?: number | null;
};

const paymentFrequencyOptions: {
  label: string;
  value: TenancyPaymentFrequency;
}[] = [
  { label: "Yearly / Annual", value: "annual" },
  { label: "Biannual", value: "biannual" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
];

export function TenancyForm({
  tenantId,
  unitId,
  defaultAnnualRent,
}: TenancyFormProps) {
  const [startDate, setStartDate] = useState(getTodayDateInputValue());
  const [paymentFrequency, setPaymentFrequency] =
    useState<TenancyPaymentFrequency>("annual");

  const [state, formAction, isPending] = useActionState(
    createTenancyAction,
    initialTenancyActionState,
  );

  const calculatedEndDate = useMemo(() => {
    try {
      return calculateTenancyEndDate(startDate, paymentFrequency);
    } catch {
      return "";
    }
  }, [paymentFrequency, startDate]);

  const displayedEndDate = calculatedEndDate
    ? formatDisplayDate(calculatedEndDate)
    : "Select a valid rent start date";

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setStartDate(event.target.value);
  }

  function handlePaymentFrequencyChange(event: ChangeEvent<HTMLSelectElement>) {
    setPaymentFrequency(event.target.value as TenancyPaymentFrequency);
  }

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Rental agreement created"
        errorTitle="Rental agreement failed"
      />

      <Card>
        <CardContent>
          <div className="space-y-5">
            <TrustNotice
              title="Create rental agreement"
              description="Set the rent amount and agreed rent start date. This date controls the tenant’s rent calendar, renewal date, agreement period, and payment period."
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
              label="Rent amount"
              name="rentAmount"
              defaultValue={defaultAnnualRent ?? null}
              placeholder="0.00"
              error={state.fieldErrors?.rentAmount?.[0]}
              helperText="Annual rent is the default because most Nigerian landlords collect rent yearly."
              required
            />

            <Select
              label="Rent payment frequency"
              name="paymentFrequency"
              options={paymentFrequencyOptions}
              value={paymentFrequency}
              onChange={handlePaymentFrequencyChange}
              error={state.fieldErrors?.paymentFrequency?.[0]}
              helperText="Keep as yearly unless this tenant is on a different payment arrangement."
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Rent start / move-in date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                error={state.fieldErrors?.startDate?.[0]}
                helperText="Use the agreed date the tenant’s rent calendar starts. This may be different from the payment date."
                required
              />

              <div className="rounded-button border border-border-soft bg-background px-4 py-3">
                <p className="text-sm font-bold text-text-muted">
                  Rent end date
                </p>
                <p className="mt-2 text-lg font-extrabold text-text-strong">
                  {displayedEndDate}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Automatically calculated from the rent start date and payment
                  frequency.
                </p>
              </div>
            </div>

            <Input
              label="Renewal reminder date"
              name="renewalNoticeDate"
              type="date"
              helperText="Optional. Use a date before the rent expires so BOPA can remind you later."
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
          </div>
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
