"use client";

import { useActionState, useMemo } from "react";
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

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Tenant payment link prepared"
        errorTitle="Payment link failed"
      />

      <Card>
        <CardContent>
          <TrustNotice
            title="Tenant-paid online rent"
            description="The tenant pays rent plus the Tenuro fee. Paystack splits the payment so rent goes to the landlord payout account and the Tenuro fee is collected automatically."
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

          {state.tenantPaymentUrl ? (
            <div className="rounded-button bg-primary-soft p-4">
              <p className="text-sm font-extrabold text-primary">
                Tenant payment link
              </p>

              <p className="mt-2 break-all text-sm font-semibold leading-6 text-text-strong">
                {state.tenantPaymentUrl}
              </p>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                Copy and send this link to the tenant on WhatsApp. The tenant
                will review the rent amount and continue to Paystack.
              </p>
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
            helperText="This is the rent amount only. The Tenuro fee is added separately before the tenant proceeds to Paystack."
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Payment period start"
              name="periodStart"
              type="date"
              error={state.fieldErrors?.periodStart?.[0]}
            />

            <Input
              label="Payment period end"
              name="periodEnd"
              type="date"
              error={state.fieldErrors?.periodEnd?.[0]}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Prepare Tenant Payment Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
