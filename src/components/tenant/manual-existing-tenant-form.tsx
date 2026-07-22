"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createManualExistingTenantAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";
import { RENT_PAYMENT_FREQUENCY_LABELS } from "@/lib/rent-cycle";
import type { ExistingTenantClaimUnitOption } from "@/server/services/existing-tenant-claims.service";

type ManualExistingTenantFormProps = {
  units: ExistingTenantClaimUnitOption[];
};

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function ManualExistingTenantForm({ units }: ManualExistingTenantFormProps) {
  const router = useRouter();
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.value ?? "");
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.value === selectedUnitId) ?? units[0],
    [selectedUnitId, units],
  );
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
        title="The unit controls the rent"
        description="Choose the apartment and enter the original move-in date. BOPA will lock the saved unit rent and calculate every rent cycle from that date."
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="manual-existing-unit" className="text-sm font-bold text-text-strong">
            Apartment or unit
          </label>
          <select
            id="manual-existing-unit"
            name="unitId"
            value={selectedUnitId}
            onChange={(event) => setSelectedUnitId(event.target.value)}
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
            required
          >
            {units.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
          {state.fieldErrors?.unitId?.[0] ? (
            <p className="text-sm font-semibold text-danger">{state.fieldErrors.unitId[0]}</p>
          ) : null}
        </div>

        <input type="hidden" name="paymentFrequency" value={selectedUnit?.rentFrequency ?? "annual"} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-button border border-border-soft bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Unit rent</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {formatNaira(selectedUnit?.rentAmount ?? 0)}
            </p>
          </div>
          <div className="rounded-button border border-border-soft bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Rent collection</p>
            <p className="mt-2 text-lg font-black text-text-strong">
              {selectedUnit
                ? RENT_PAYMENT_FREQUENCY_LABELS[selectedUnit.rentFrequency]
                : "Select a unit"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Tenant’s full name" name="fullName" autoComplete="name" error={state.fieldErrors?.fullName?.[0]} required />
          <Input label="Tenant’s phone number" name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" placeholder="Example: 08012345678" error={state.fieldErrors?.phoneNumber?.[0]} required />
        </div>
        <Input label="Occupation" name="occupation" placeholder="Example: Trader, teacher or engineer" error={state.fieldErrors?.occupation?.[0]} required />
      </div>

      <div className="space-y-5 border-t border-border-soft pt-6">
        <div>
          <h2 className="text-lg font-black text-text-strong">Rent anchor</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Use the date the tenant first moved in, even if payment was made earlier.
          </p>
        </div>
        <Input
          label="When did the tenancy start?"
          name="tenancyStartDate"
          type="date"
          helperText="BOPA will keep this as the permanent rent-cycle date."
          error={state.fieldErrors?.tenancyStartDate?.[0]}
          required
        />
      </div>

      <div className="space-y-5 border-t border-border-soft pt-6">
        <div>
          <h2 className="text-lg font-black text-text-strong">Last rent payment</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Payment is recorded as a transaction only; it does not change the rent-cycle date.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyInput label="Amount last paid" name="lastPaymentAmount" error={state.fieldErrors?.lastPaymentAmount?.[0]} required />
          <Input label="Date of last payment" name="lastPaymentDate" type="date" error={state.fieldErrors?.lastPaymentDate?.[0]} required />
        </div>
      </div>

      <Button type="submit" size="lg" isLoading={isPending} fullWidth>
        Save and check rent history
      </Button>
    </form>
  );
}
