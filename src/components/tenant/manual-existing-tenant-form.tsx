"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createManualExistingTenantAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { ExistingTenantClaimUnitOption } from "@/server/services/existing-tenant-claims.service";

type ManualExistingTenantFormProps = {
  units: ExistingTenantClaimUnitOption[];
};

const paymentFrequencyOptions = [
  { label: "Every year", value: "annual" },
  { label: "Every 6 months", value: "biannual" },
  { label: "Every 3 months", value: "quarterly" },
  { label: "Every month", value: "monthly" },
];

export function ManualExistingTenantForm({
  units,
}: ManualExistingTenantFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createManualExistingTenantAction,
    initialExistingTenantClaimActionState,
  );

  useEffect(() => {
    if (state.ok && state.claimId) {
      router.push(`/existing-tenant-claims/${state.claimId}`);
      router.refresh();
    }
  }, [router, state.claimId, state.ok]);

  return (
    <form action={formAction} className="space-y-6">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Tenant details saved"
        errorTitle="Please check the details"
      />

      <TrustNotice
        title="Enter only what you know"
        description="After saving, BOPA will show the tenant’s rent years. You can record any unpaid year or part payment before confirming the tenancy."
      />

      <div className="space-y-5">
        <Select
          label="Apartment or unit"
          name="unitId"
          options={units}
          error={state.fieldErrors?.unitId?.[0]}
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Tenant’s full name"
            name="fullName"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Tenant’s phone number"
            name="phoneNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Example: 08012345678"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />
        </div>

        <Input
          label="Occupation"
          name="occupation"
          placeholder="Example: Trader, teacher or engineer"
          error={state.fieldErrors?.occupation?.[0]}
          required
        />
      </div>

      <div className="space-y-5 border-t border-border-soft pt-6">
        <div>
          <h2 className="text-lg font-black text-text-strong">Rent dates</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            These dates help BOPA know when the next rent is due.
          </p>
        </div>

        <Select
          label="How is rent collected"
          name="paymentFrequency"
          options={paymentFrequencyOptions}
          defaultValue="annual"
          error={state.fieldErrors?.paymentFrequency?.[0]}
          required
        />

        <Input
          label="When did the tenancy start?"
          name="tenancyStartDate"
          type="date"
          helperText="Use the date the tenant first moved in. BOPA will keep this date as the rent-cycle date."
          error={state.fieldErrors?.tenancyStartDate?.[0]}
          required
        />
      </div>

      <div className="space-y-5 border-t border-border-soft pt-6">
        <div>
          <h2 className="text-lg font-black text-text-strong">
            Last rent payment
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Enter the most recent amount received, including a part payment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyInput
            label="Amount last paid"
            name="lastPaymentAmount"
            error={state.fieldErrors?.lastPaymentAmount?.[0]}
            required
          />

          <Input
            label="Date of last payment"
            name="lastPaymentDate"
            type="date"
            error={state.fieldErrors?.lastPaymentDate?.[0]}
            required
          />
        </div>
      </div>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" isLoading={isPending} fullWidth>
        Save and check rent history
      </Button>
    </form>
  );
}
