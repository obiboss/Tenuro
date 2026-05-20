"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { initializeRentPaymentAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { TrustNotice } from "@/components/ui/trust-notice";

type RentPaymentModalProps = {
  tenancyId: string;
  defaultAmount: number;
  landlordChargesAmount: number;
  agentCommissionAmount: number;
  tenuroFeeAmount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RentPaymentModal({
  tenancyId,
  defaultAmount,
  landlordChargesAmount,
  agentCommissionAmount,
  tenuroFeeAmount,
  periodStart,
  periodEnd,
}: RentPaymentModalProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const sentMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    initializeRentPaymentAction,
    initialPaymentActionState,
  );

  const totalPayable =
    defaultAmount +
    landlordChargesAmount +
    agentCommissionAmount +
    tenuroFeeAmount;

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
        errorTitle="Online payment unavailable"
      />

      <Card>
        <CardContent>
          <div className="space-y-5">
            <TrustNotice
              title="Tenant-paid final onboarding payment"
              description="The tenant pays rent, landlord charges, approved agent commission, and the BOPA fee in one secure Paystack checkout when payout verification is ready."
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
            <input type="hidden" name="periodStart" value={periodStart ?? ""} />
            <input type="hidden" name="periodEnd" value={periodEnd ?? ""} />

            <CurrencyInput
              label="Rent amount"
              name="amount"
              defaultValue={defaultAmount}
              placeholder="0.00"
              error={state.fieldErrors?.amount?.[0]}
              helperText="This is the rent/outstanding balance. Landlord charges, approved agent commission, and BOPA fee are added automatically."
              required
            />

            <div className="rounded-card border border-border-soft bg-background p-4">
              <p className="font-extrabold text-text-strong">
                Final payment breakdown
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-text-muted">
                    Rent / outstanding balance
                  </span>
                  <span className="font-black text-text-strong">
                    {formatMoney(defaultAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-text-muted">
                    Landlord charges
                  </span>
                  <span className="font-black text-text-strong">
                    {formatMoney(landlordChargesAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-text-muted">
                    Agent commission
                  </span>
                  <span className="font-black text-text-strong">
                    {formatMoney(agentCommissionAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-text-muted">
                    BOPA fee
                  </span>
                  <span className="font-black text-text-strong">
                    {formatMoney(tenuroFeeAmount)}
                  </span>
                </div>

                <div className="border-t border-border-soft pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-black text-text-strong">
                      Total tenant pays
                    </span>
                    <span className="text-lg font-black text-text-strong">
                      {formatMoney(totalPayable)}
                    </span>
                  </div>
                </div>
              </div>
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
