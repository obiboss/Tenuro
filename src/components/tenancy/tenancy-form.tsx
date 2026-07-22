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
  REMINDER_INTERVAL_OPTIONS,
  formatReminderPreview,
  type ReminderIntervalDays,
} from "@/lib/reminder-interval";
import {
  RENT_PAYMENT_FREQUENCY_LABELS,
  type RentPaymentFrequency,
} from "@/lib/rent-cycle";
import {
  calculateTenancyEndDate,
  formatDisplayDate,
  getTodayDateInputValue,
} from "@/lib/tenancy-period";

 type TenancyFormProps = {
  tenantId: string;
  unitId: string;
  rentAmount: number;
  rentFrequency: RentPaymentFrequency;
};

const reminderIntervalOptions = REMINDER_INTERVAL_OPTIONS.map((option) => ({
  label: option.label,
  value: String(option.value),
}));

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function TenancyForm({
  tenantId,
  unitId,
  rentAmount,
  rentFrequency,
}: TenancyFormProps) {
  const [startDate, setStartDate] = useState(getTodayDateInputValue());
  const [reminderIntervalDays, setReminderIntervalDays] =
    useState<ReminderIntervalDays>(90);

  const [state, formAction, isPending] = useActionState(
    createTenancyAction,
    initialTenancyActionState,
  );

  const calculatedEndDate = useMemo(() => {
    try {
      return calculateTenancyEndDate(startDate, rentFrequency);
    } catch {
      return "";
    }
  }, [rentFrequency, startDate]);

  const displayedEndDate = calculatedEndDate
    ? formatDisplayDate(calculatedEndDate)
    : "Select a valid rent start date";

  const reminderPreview = useMemo(() => {
    if (!calculatedEndDate) {
      return "Select tenancy dates to preview the renewal reminder.";
    }

    try {
      return formatReminderPreview(calculatedEndDate, reminderIntervalDays);
    } catch {
      return "Renewal reminder preview unavailable.";
    }
  }, [calculatedEndDate, reminderIntervalDays]);

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setStartDate(event.target.value);
  }

  function handleReminderIntervalChange(event: ChangeEvent<HTMLSelectElement>) {
    setReminderIntervalDays(Number(event.target.value) as ReminderIntervalDays);
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
              description="The unit's rent amount and collection frequency are locked. Enter the agreed move-in date; BOPA will use it as the permanent rent-cycle anchor."
            />

            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="unitId" value={unitId} />
            <input type="hidden" name="rentAmount" value={rentAmount} />
            <input
              type="hidden"
              name="paymentFrequency"
              value={rentFrequency}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-button border border-border-soft bg-background px-4 py-3">
                <p className="text-sm font-bold text-text-muted">Unit rent</p>
                <p className="mt-2 text-lg font-extrabold text-text-strong">
                  {formatNaira(rentAmount)}
                </p>
              </div>
              <div className="rounded-button border border-border-soft bg-background px-4 py-3">
                <p className="text-sm font-bold text-text-muted">
                  Rent collection
                </p>
                <p className="mt-2 text-lg font-extrabold text-text-strong">
                  {RENT_PAYMENT_FREQUENCY_LABELS[rentFrequency]}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Rent start / move-in date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                error={state.fieldErrors?.startDate?.[0]}
                helperText="This date controls every future rent due date. The payment date will not change it."
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
                  Calculated from the move-in date and locked unit frequency.
                </p>
              </div>
            </div>

            <Select
              label="Renewal reminder interval"
              name="reminderIntervalDays"
              options={reminderIntervalOptions}
              value={String(reminderIntervalDays)}
              onChange={handleReminderIntervalChange}
              error={state.fieldErrors?.reminderIntervalDays?.[0]}
              helperText="BOPA will remind you this many days before the rent period ends."
              required
            />

            <div className="rounded-button border border-border-soft bg-background px-4 py-3">
              <p className="text-sm font-bold text-text-muted">
                Renewal reminder preview
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-strong">
                {reminderPreview}
              </p>
            </div>

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
            Continue to Landlord Charges
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
