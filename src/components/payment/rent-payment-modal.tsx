"use client";

import { useActionState, useEffect, useMemo } from "react";
import { initializeRentPaymentAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";

type RentPaymentModalProps = {
  tenancyId: string;
  defaultAmount: number;
};

export function RentPaymentModal({
  tenancyId,
  defaultAmount,
}: RentPaymentModalProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [state, formAction, isPending] = useActionState(
    initializeRentPaymentAction,
    initialPaymentActionState,
  );

  useEffect(() => {
    if (state.ok && state.authorizationUrl) {
      window.location.href = state.authorizationUrl;
    }
  }, [state.ok, state.authorizationUrl]);

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Payment link prepared"
        errorTitle="Payment link failed"
      />

      <Card>
        <CardContent>
          <TrustNotice
            title="Gateway payment"
            description="The tenant pays online. Tenuro collects only the configured gateway fee, and the rent is settled to the landlord payout account."
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

          <input type="hidden" name="tenancyId" value={tenancyId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <CurrencyInput
            label="Rent amount"
            name="amount"
            defaultValue={defaultAmount}
            placeholder="0.00"
            error={state.fieldErrors?.amount?.[0]}
            helperText="This is the rent amount before any gateway fee."
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Period start"
              name="periodStart"
              type="date"
              error={state.fieldErrors?.periodStart?.[0]}
            />

            <Input
              label="Period end"
              name="periodEnd"
              type="date"
              error={state.fieldErrors?.periodEnd?.[0]}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Continue to Paystack
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
