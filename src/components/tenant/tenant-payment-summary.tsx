"use client";

import { useActionState, useMemo } from "react";
import { CreditCard } from "lucide-react";
import { initializeTenantDashboardRentPaymentAction } from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { formatNaira } from "@/server/utils/money";

type TenantPaymentSummaryProps = {
  outstandingBalance: number;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function TenantPaymentSummary({
  outstandingBalance,
}: TenantPaymentSummaryProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [state, formAction, isPending] = useActionState(
    initializeTenantDashboardRentPaymentAction,
    initialPaymentActionState,
  );

  const hasBalance = outstandingBalance > 0;

  return (
    <Card>
      <CardContent>
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Payment checkout ready"
          errorTitle="Payment checkout failed"
        />

        <div className="space-y-4">
          <TrustNotice
            title={hasBalance ? "Rent payment" : "No rent due"}
            description={
              hasBalance
                ? `You currently have ${formatNaira(
                    outstandingBalance,
                  )} outstanding. Continue to Paystack when you are ready to pay.`
                : "Your rent balance is currently clear."
            }
            icon={<CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />}
          />

          {state.message && !state.ok ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {state.message}
            </div>
          ) : null}

          {state.tenantPaymentUrl ? (
            <div className="rounded-button bg-primary-soft p-4">
              <p className="text-sm font-black text-text-strong">
                Checkout ready
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                This link expires on {formatDateTime(state.expiresAt)}.
              </p>

              <a
                href={state.tenantPaymentUrl}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
              >
                Continue to Paystack
              </a>
            </div>
          ) : null}

          {hasBalance && !state.tenantPaymentUrl ? (
            <form action={formAction}>
              <input
                type="hidden"
                name="idempotencyKey"
                value={idempotencyKey}
              />

              <Button type="submit" isLoading={isPending} fullWidth>
                Pay Rent Now
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
