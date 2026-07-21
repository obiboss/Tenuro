"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import {
  initializeRentPaymentAction,
  recordManualPaymentAction,
} from "@/actions/payments.actions";
import { initialPaymentActionState } from "@/actions/payment.state";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import { runOfflineCapableFormAction } from "@/lib/offline/offline-form.client";
import { saveLandlordPaymentOffline } from "@/lib/offline/operational-mutations.client";

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
  const offlinePaymentAction = useCallback(
    (previousState: typeof initialPaymentActionState, formData: FormData) =>
      runOfflineCapableFormAction({
        previousState,
        formData,
        onlineAction: recordManualPaymentAction,
        saveOffline: saveLandlordPaymentOffline,
      }),
    [],
  );
  const negotiatedPaymentIdempotencyKey = useMemo(
    () => crypto.randomUUID(),
    [],
  );
  const manualPaymentIdempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [showOfflineRecordForm, setShowOfflineRecordForm] = useState(false);

  const [
    negotiatedPaymentState,
    negotiatedPaymentFormAction,
    isPreparingPaymentLink,
  ] = useActionState(initializeRentPaymentAction, initialPaymentActionState);

  const [manualPaymentState, manualPaymentFormAction, isRecordingPayment] =
    useActionState(offlinePaymentAction, initialPaymentActionState);

  return (
    <div className="space-y-5">
      <form action={negotiatedPaymentFormAction} className="space-y-5">
        <ActionResultToast
          ok={negotiatedPaymentState.ok}
          message={negotiatedPaymentState.message}
          successTitle="Payment link ready"
          errorTitle="Payment link failed"
        />

        <TrustNotice
          title="Send tenant payment link"
          description="Use this when a tenant agrees to pay full rent or a negotiated part payment. BOPA will record the payment automatically after the tenant pays through Paystack."
        />

        {negotiatedPaymentState.message ? (
          <div
            role="alert"
            className={
              negotiatedPaymentState.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {negotiatedPaymentState.message}
          </div>
        ) : null}

        <input
          type="hidden"
          name="idempotencyKey"
          value={negotiatedPaymentIdempotencyKey}
        />

        <Select
          label="Tenancy"
          name="tenancyId"
          options={tenancies}
          error={negotiatedPaymentState.fieldErrors?.tenancyId?.[0]}
          required
        />

        <CurrencyInput
          label="Agreed amount tenant should pay"
          name="amount"
          placeholder="0.00"
          error={negotiatedPaymentState.fieldErrors?.amount?.[0]}
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Payment period start"
            name="periodStart"
            type="date"
            error={negotiatedPaymentState.fieldErrors?.periodStart?.[0]}
          />

          <Input
            label="Payment period end"
            name="periodEnd"
            type="date"
            error={negotiatedPaymentState.fieldErrors?.periodEnd?.[0]}
          />
        </div>

        <Button type="submit" isLoading={isPreparingPaymentLink} fullWidth>
          Prepare Tenant Payment Link
        </Button>

        {negotiatedPaymentState.ok &&
        negotiatedPaymentState.whatsappMessage &&
        negotiatedPaymentState.tenantPaymentUrl ? (
          <div className="space-y-4 rounded-card border border-primary/15 bg-primary-soft/40 p-4">
            <div>
              <p className="text-sm font-extrabold text-text-strong">
                Payment link prepared
              </p>
              <p className="mt-1 break-all text-sm font-semibold leading-6 text-text-muted">
                {negotiatedPaymentState.tenantPaymentUrl}
              </p>
            </div>

            <WhatsAppSendButton
              phoneNumber={negotiatedPaymentState.tenantWhatsappNumber ?? null}
              message={negotiatedPaymentState.whatsappMessage}
              label="Send Link on WhatsApp"
            />
          </div>
        ) : null}
      </form>

      <div className="rounded-card border border-border-soft bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-extrabold text-text-strong">
              Record an offline payment instead
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Use this only when the tenant has already paid by cash, bank
              transfer, or another method outside BOPA.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowOfflineRecordForm((current) => !current)}
          >
            {showOfflineRecordForm ? "Hide Offline Form" : "Record Offline"}
          </Button>
        </div>

        {showOfflineRecordForm ? (
          <form action={manualPaymentFormAction} className="mt-5 space-y-5">
            <ActionResultToast
              ok={manualPaymentState.ok}
              message={manualPaymentState.message}
              successTitle="Offline payment recorded"
              errorTitle="Offline payment failed"
            />

            <TrustNotice
              title="Offline payment record"
              description="This is only for payments already received outside BOPA. It does not send the tenant a Paystack link."
            />

            {manualPaymentState.message ? (
              <div
                role="alert"
                className={
                  manualPaymentState.ok
                    ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                    : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
                }
              >
                {manualPaymentState.message}
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
              error={manualPaymentState.fieldErrors?.tenancyId?.[0]}
              required
            />

            <CurrencyInput
              label="Amount already received"
              name="amountPaid"
              placeholder="0.00"
              error={manualPaymentState.fieldErrors?.amountPaid?.[0]}
              required
            />

            <Select
              label="Payment method"
              name="paymentMethod"
              options={paymentMethodOptions}
              error={manualPaymentState.fieldErrors?.paymentMethod?.[0]}
              required
            />

            <Input
              label="Payment reference"
              name="paymentReference"
              placeholder="Bank narration, teller number, or receipt reference"
              error={manualPaymentState.fieldErrors?.paymentReference?.[0]}
            />

            <Input
              label="Payment date"
              name="paymentDate"
              type="datetime-local"
              error={manualPaymentState.fieldErrors?.paymentDate?.[0]}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Payment period start"
                name="paymentForPeriodStart"
                type="date"
                error={
                  manualPaymentState.fieldErrors?.paymentForPeriodStart?.[0]
                }
              />

              <Input
                label="Payment period end"
                name="paymentForPeriodEnd"
                type="date"
                error={manualPaymentState.fieldErrors?.paymentForPeriodEnd?.[0]}
              />
            </div>

            <Textarea
              label="Notes"
              name="notes"
              placeholder="Optional internal note"
              error={manualPaymentState.fieldErrors?.notes?.[0]}
            />

            <Button
              type="submit"
              variant="secondary"
              isLoading={isRecordingPayment}
              fullWidth
            >
              Record Offline Payment
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
