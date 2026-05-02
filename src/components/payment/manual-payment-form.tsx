"use client";

import { useActionState, useEffect, useMemo } from "react";
import { initializeManualRentAppFeePaymentAction } from "@/actions/app-fee-payment.actions";
import { initialAppFeePaymentActionState } from "@/actions/app-fee-payment.state";
import { recordManualPaymentAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type ManualPaymentFormProps = {
  tenancies: {
    label: string;
    value: string;
    rentAmount: number;
  }[];
};

const paymentMethodOptions = [
  {
    label: "Bank transfer",
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

export function ManualPaymentForm({ tenancies }: ManualPaymentFormProps) {
  const manualPaymentIdempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const appFeeIdempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [paymentState, paymentFormAction, isRecordingPayment] = useActionState(
    recordManualPaymentAction,
    initialPaymentActionState,
  );

  const [appFeeState, appFeeFormAction, isPreparingAppFee] = useActionState(
    initializeManualRentAppFeePaymentAction,
    initialAppFeePaymentActionState,
  );

  useEffect(() => {
    if (appFeeState.ok && appFeeState.authorizationUrl) {
      window.location.href = appFeeState.authorizationUrl;
    }
  }, [appFeeState.ok, appFeeState.authorizationUrl]);

  return (
    <div className="space-y-5">
      <form action={paymentFormAction} className="space-y-5">
        <ActionResultToast
          ok={paymentState.ok}
          message={paymentState.message}
          successTitle="Manual payment recorded"
          errorTitle="Manual payment failed"
        />

        <TrustNotice
          title="Offline rent payment"
          description="Use this when rent was paid by bank transfer, cash, or another offline method. After recording rent, pay only the Tenuro app fee separately."
        />

        {paymentState.message ? (
          <div
            role="alert"
            className={
              paymentState.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {paymentState.message}
          </div>
        ) : null}

        <input
          type="hidden"
          name="idempotencyKey"
          value={manualPaymentIdempotencyKey}
        />

        <Select
          label="Tenancy"
          name="tenancyId"
          options={tenancies}
          error={paymentState.fieldErrors?.tenancyId?.[0]}
          required
        />

        <CurrencyInput
          label="Amount paid"
          name="amountPaid"
          placeholder="0.00"
          error={paymentState.fieldErrors?.amountPaid?.[0]}
          required
        />

        <Select
          label="Payment method"
          name="paymentMethod"
          options={paymentMethodOptions}
          error={paymentState.fieldErrors?.paymentMethod?.[0]}
          required
        />

        <Input
          label="Payment reference"
          name="paymentReference"
          placeholder="Bank narration, teller number, or receipt reference"
          error={paymentState.fieldErrors?.paymentReference?.[0]}
        />

        <Input
          label="Payment date"
          name="paymentDate"
          type="datetime-local"
          error={paymentState.fieldErrors?.paymentDate?.[0]}
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Payment period start"
            name="paymentForPeriodStart"
            type="date"
            error={paymentState.fieldErrors?.paymentForPeriodStart?.[0]}
          />

          <Input
            label="Payment period end"
            name="paymentForPeriodEnd"
            type="date"
            error={paymentState.fieldErrors?.paymentForPeriodEnd?.[0]}
          />
        </div>

        <Textarea
          label="Notes"
          name="notes"
          placeholder="Optional internal note"
          error={paymentState.fieldErrors?.notes?.[0]}
        />

        <Button type="submit" isLoading={isRecordingPayment} fullWidth>
          Record Manual Rent Payment
        </Button>
      </form>

      {paymentState.ok && paymentState.paymentId ? (
        <form action={appFeeFormAction} className="space-y-4">
          <ActionResultToast
            ok={appFeeState.ok}
            message={appFeeState.message}
            successTitle="App fee checkout prepared"
            errorTitle="App fee checkout failed"
          />

          <input
            type="hidden"
            name="rentPaymentId"
            value={paymentState.paymentId}
          />
          <input
            type="hidden"
            name="idempotencyKey"
            value={appFeeIdempotencyKey}
          />

          <TrustNotice
            title="Tenuro app fee required"
            description="Because the rent was collected outside Tenuro, the landlord should now pay only the Tenuro app fee. This does not charge the tenant."
          />

          {appFeeState.message ? (
            <div
              role="alert"
              className={
                appFeeState.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {appFeeState.message}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="secondary"
            isLoading={isPreparingAppFee}
            fullWidth
          >
            Pay Tenuro App Fee
          </Button>
        </form>
      ) : null}
    </div>
  );
}
