"use client";

import { useActionState } from "react";
import { submitManagerTenantOnboardingRequestAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type PublicManagerTenantOnboardingFormProps = {
  token: string;
  request: ManagerTenantOnboardingRequestRow;
};

const idTypeOptions = [
  ["nin", "NIN"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's License"],
  ["voters_card", "Voter's Card"],
] as const;

const frequencyOptions = [
  ["annual", "Annual rent"],
  ["monthly", "Monthly rent"],
  ["quarterly", "Quarterly rent"],
  ["biannual", "Biannual rent"],
] as const;

export function PublicManagerTenantOnboardingForm({
  token,
  request,
}: PublicManagerTenantOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  if (state.ok) {
    return (
      <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <div className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
          Submitted
        </div>
        <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
          Details submitted
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Your details have been sent to the property manager.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-card border border-border-soft bg-white shadow-sm"
    >
      <input type="hidden" name="token" value={token} />

      <div className="border-b border-border-soft p-5">
        <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
          Tenant details
        </p>

        <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
          Confirm your details
        </h1>

        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          {request.manager_units?.unit_label ?? "Unit"} ·{" "}
          {request.manager_properties?.property_name ?? "Property"}
        </p>
      </div>

      <div className="space-y-5 p-5">
        {state.message ? (
          <div
            role="alert"
            className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            {state.message}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-black tracking-tight text-text-strong">
              Personal details
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              These details will appear on your tenant record.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              name="fullName"
              defaultValue={request.invited_tenant_full_name ?? ""}
              error={state.fieldErrors?.fullName?.[0]}
              required
            />

            <Input
              label="Phone number"
              name="phoneNumber"
              defaultValue={request.invited_tenant_phone_number ?? ""}
              error={state.fieldErrors?.phoneNumber?.[0]}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={request.invited_tenant_email ?? ""}
              placeholder="Optional"
              error={state.fieldErrors?.email?.[0]}
            />

            <Input
              label="Occupation"
              name="occupation"
              placeholder="Optional"
              error={state.fieldErrors?.occupation?.[0]}
            />
          </div>
        </section>

        <section className="border-t border-border-soft pt-5">
          <div>
            <h2 className="text-base font-black tracking-tight text-text-strong">
              Identification
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Provide one valid identification record.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-bold text-text-strong"
                htmlFor="idType"
              >
                Means of ID
              </label>
              <select
                id="idType"
                name="idType"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                required
              >
                {idTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.idType?.[0] ? (
                <p className="text-sm font-semibold text-danger">
                  {state.fieldErrors.idType[0]}
                </p>
              ) : null}
            </div>

            <Input
              label="ID number"
              name="idNumber"
              error={state.fieldErrors?.idNumber?.[0]}
              required
            />
          </div>
        </section>

        <section className="border-t border-border-soft pt-5">
          <div>
            <h2 className="text-base font-black tracking-tight text-text-strong">
              Rent details
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Enter your move-in date, rent frequency, and rent amount.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Move-in date"
              name="moveInDate"
              type="date"
              error={state.fieldErrors?.moveInDate?.[0]}
              required
            />

            <div className="space-y-2">
              <label
                className="text-sm font-bold text-text-strong"
                htmlFor="paymentFrequency"
              >
                Rent frequency
              </label>
              <select
                id="paymentFrequency"
                name="paymentFrequency"
                defaultValue="annual"
                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                required
              >
                {frequencyOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <CurrencyInput
              label="Rent amount"
              name="claimedRentAmount"
              placeholder="0.00"
              defaultValue={String(request.manager_units?.rent_amount ?? "")}
              error={state.fieldErrors?.claimedRentAmount?.[0]}
              required
            />
          </div>
        </section>

        <details className="rounded-card border border-border-soft bg-white p-4">
          <summary className="cursor-pointer text-sm font-black text-primary">
            Add note
          </summary>

          <div className="mt-3 space-y-2">
            <label
              htmlFor="tenantNotes"
              className="text-sm font-bold text-text-strong"
            >
              Note
            </label>
            <textarea
              id="tenantNotes"
              name="tenantNotes"
              rows={3}
              placeholder="Optional"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />
          </div>
        </details>
      </div>

      <div className="border-t border-border-soft p-5">
        <Button type="submit" isLoading={isPending} fullWidth>
          Submit Details
        </Button>
      </div>
    </form>
  );
}
