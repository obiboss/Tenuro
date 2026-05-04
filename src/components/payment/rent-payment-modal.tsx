"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
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

function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

export function RentPaymentModal({
  tenancyId,
  defaultAmount,
}: RentPaymentModalProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const sentMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    initializeRentPaymentAction,
    initialPaymentActionState,
  );

  useEffect(() => {
    if (
      !state.ok ||
      !state.whatsappMessage ||
      !state.tenantWhatsappNumber ||
      sentMessageRef.current === state.whatsappMessage
    ) {
      return;
    }

    sentMessageRef.current = state.whatsappMessage;

    window.location.assign(
      buildWhatsAppUrl(state.tenantWhatsappNumber, state.whatsappMessage),
    );
  }, [state.ok, state.tenantWhatsappNumber, state.whatsappMessage]);

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Payment link ready"
        errorTitle="Payment link failed"
      />

      <Card>
        <CardContent>
          <div className="space-y-5">
            <TrustNotice
              title="Tenant-paid online rent"
              description="Tenuro will prepare the rent payment link and open WhatsApp with the message ready to send. The tenant must fully settle the balance before account activation becomes available."
            />

            {state.message && !state.ok ? (
              <div
                role="alert"
                className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
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
              helperText="This should be the full outstanding rent amount. The Tenuro fee is added separately before the tenant proceeds to Paystack."
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
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Send Tenant Payment Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
