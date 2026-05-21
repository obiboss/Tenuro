"use client";

import { useActionState } from "react";
import { createLandlordTenancyChargeAction } from "@/actions/landlord-tenancy-charges.actions";
import { initialLandlordTenancyChargeActionState } from "@/actions/landlord-tenancy-charges.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type LandlordTenancyChargeFormProps = {
  tenancyId: string;
};

export function LandlordTenancyChargeForm({
  tenancyId,
}: LandlordTenancyChargeFormProps) {
  const [state, formAction, isPending] = useActionState(
    createLandlordTenancyChargeAction,
    initialLandlordTenancyChargeActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Charge added"
        errorTitle="Charge could not be added"
      />

      <input type="hidden" name="tenancyId" value={tenancyId} />
      <input type="hidden" name="currencyCode" value="NGN" />

      <TrustNotice
        title="Landlord charges are paid to you"
        description="Add agreement fees, caution deposits, service charges, or any other move-in charge. Each charge is added to the review list below."
      />

      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Input
        label="Charge name"
        name="chargeName"
        placeholder="Example: Caution deposit"
        error={state.fieldErrors?.chargeName?.[0]}
        helperText="Each active charge name must be unique for this tenancy."
        required
      />

      <CurrencyInput
        label="Amount"
        name="amount"
        placeholder="0.00"
        error={state.fieldErrors?.amount?.[0]}
        required
      />

      <Textarea
        label="Description"
        name="description"
        placeholder="Optional explanation for this charge"
        error={state.fieldErrors?.description?.[0]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-button border border-border-soft bg-background p-4">
          <input
            type="checkbox"
            name="isRefundable"
            className="mt-1 size-4 rounded border-border-soft"
          />
          <span>
            <span className="block text-sm font-extrabold text-text-strong">
              Refundable
            </span>
            <span className="mt-1 block text-sm leading-6 text-text-muted">
              Use for caution or damages deposits that may be returned later.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-button border border-border-soft bg-background p-4">
          <input
            type="checkbox"
            name="isRequiredBeforeMoveIn"
            defaultChecked
            className="mt-1 size-4 rounded border-border-soft"
          />
          <span>
            <span className="block text-sm font-extrabold text-text-strong">
              Required before move-in
            </span>
            <span className="mt-1 block text-sm leading-6 text-text-muted">
              Include this in the tenant’s final onboarding payment.
            </span>
          </span>
        </label>
      </div>

      <Button type="submit" isLoading={isPending} fullWidth>
        Add to Charge List
      </Button>
    </form>
  );
}
