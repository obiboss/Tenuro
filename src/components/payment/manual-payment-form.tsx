"use client";

import { useActionState, useMemo } from "react";
import { recordManualPaymentAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenancyOption = {
  label: string;
  value: string;
  rentAmount: number;
};

type ManualPaymentFormProps = {
  tenancies: TenancyOption[];
};

const paymentMethodOptions = [
  {
    label: "Bank Transfer",
    value: "bank_transfer",
  },
  {
    label: "Cash",
    value: "cash",
  },
  {
    label: "Other",
    value: "other",
  },
];

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ManualPaymentForm({ tenancies }: ManualPaymentFormProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [state, formAction, isPending] = useActionState(
    recordManualPaymentAction,
    initialPaymentActionState,
  );

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Payment recorded"
        errorTitle="Payment failed"
      />

      <Card>
        <CardContent>
          <TrustNotice
            title="Manual payment record"
            description="Use this when a tenant pays by transfer, cash, or another offline method. Tenuro will post it to the tenant ledger."
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

          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <Select
            label="Rental agreement"
            name="tenancyId"
            placeholder="Select tenant and unit"
            options={tenancies}
            error={state.fieldErrors?.tenancyId?.[0]}
            required
          />

          <CurrencyInput
            label="Amount paid"
            name="amountPaid"
            placeholder="0.00"
            error={state.fieldErrors?.amountPaid?.[0]}
            required
          />

          <Select
            label="Payment method"
            name="paymentMethod"
            options={paymentMethodOptions}
            defaultValue="bank_transfer"
            error={state.fieldErrors?.paymentMethod?.[0]}
            required
          />

          <Input
            label="Payment reference"
            name="paymentReference"
            placeholder="Example: bank narration, transfer ref, receipt note"
            error={state.fieldErrors?.paymentReference?.[0]}
          />

          <Input
            label="Payment date"
            name="paymentDate"
            type="date"
            defaultValue={todayDateValue()}
            error={state.fieldErrors?.paymentDate?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Period start"
              name="paymentForPeriodStart"
              type="date"
              error={state.fieldErrors?.paymentForPeriodStart?.[0]}
            />

            <Input
              label="Period end"
              name="paymentForPeriodEnd"
              type="date"
              error={state.fieldErrors?.paymentForPeriodEnd?.[0]}
            />
          </div>

          <Textarea
            label="Private note"
            name="notes"
            placeholder="Optional note about this payment."
            error={state.fieldErrors?.notes?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isPending}
            fullWidth
            disabled={tenancies.length === 0}
          >
            Record Payment
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
