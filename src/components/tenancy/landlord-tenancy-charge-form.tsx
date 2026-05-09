"use client";

import { useActionState } from "react";
import {
  createLandlordTenancyChargeAction,
  initialLandlordTenancyChargeActionState,
} from "@/actions/landlord-tenancy-charges.actions";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type LandlordTenancyChargeFormProps = {
  tenancyId: string;
};

const chargeTypeOptions = [
  { label: "Agreement fee", value: "agreement_fee" },
  { label: "Caution deposit", value: "caution_deposit" },
  { label: "Damages deposit", value: "damages_deposit" },
  { label: "Service charge", value: "service_charge" },
  { label: "Legal fee", value: "legal_fee" },
  { label: "Documentation fee", value: "documentation_fee" },
  { label: "Other", value: "other" },
];

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
        description="Use this for agreement fees, caution deposits, damages deposits, service charge, legal fee, documentation fee, or any landlord-defined charge. These charges are added to the tenant’s final payment and paid to the landlord."
      />

      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Charge type"
          name="chargeType"
          options={chargeTypeOptions}
          error={state.fieldErrors?.chargeType?.[0]}
          required
        />

        <Input
          label="Charge label"
          name="label"
          placeholder="Example: Agreement fee"
          error={state.fieldErrors?.label?.[0]}
          required
        />
      </div>

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
        Add Landlord Charge
      </Button>
    </form>
  );
}
