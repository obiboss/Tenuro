"use client";

import { useActionState } from "react";
import { confirmManagerTenantGuarantorAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import type { ManagerTenantGuarantorRow } from "@/server/repositories/manager-tenant-guarantors.repository";

const ID_TYPES = [
  ["nin", "NIN"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's License"],
  ["voters_card", "Voter's Card"],
] as const;

export function PublicManagerGuarantorConfirmationForm({
  token,
  guarantor,
}: {
  token: string;
  guarantor: ManagerTenantGuarantorRow;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmManagerTenantGuarantorAction,
    initialManagerTenantOnboardingActionState,
  );
  const confirmed =
    guarantor.status === "confirmed" || state.guarantorConfirmed;
  const tenantName =
    guarantor.manager_tenant_onboarding_requests?.tenant_full_name ??
    guarantor.manager_tenant_onboarding_requests?.invited_tenant_full_name ??
    "the tenant";

  if (confirmed) {
    return (
      <section className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
        <p className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
          Confirmed
        </p>
        <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
          Guarantor confirmation complete
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Your information and acceptance have been recorded. The property
          manager can now continue reviewing {tenantName}&apos;s application.
        </p>
      </section>
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
          Guarantor confirmation
        </p>
        <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
          Review your details
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          {tenantName} named you as a guarantor for {guarantor.manager_units?.unit_label ?? "the unit"} at {guarantor.manager_properties?.property_name ?? "the property"}.
        </p>
      </div>

      <div className="space-y-5 p-5">
        {state.message && !state.ok ? (
          <div className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            name="fullName"
            defaultValue={guarantor.full_name}
            error={state.fieldErrors?.fullName?.[0]}
            required
          />
          <Input
            label="Phone number"
            name="phoneNumber"
            defaultValue={guarantor.phone_number}
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={guarantor.email ?? ""}
            placeholder="Optional"
            error={state.fieldErrors?.email?.[0]}
          />
          <Input
            label="Relationship to tenant"
            name="relationshipToTenant"
            defaultValue={guarantor.relationship_to_tenant}
            error={state.fieldErrors?.relationshipToTenant?.[0]}
            required
          />
        </div>

        <Input
          label="Residential address"
          name="residentialAddress"
          defaultValue={guarantor.residential_address}
          error={state.fieldErrors?.residentialAddress?.[0]}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Occupation"
            name="occupation"
            defaultValue={guarantor.occupation}
            error={state.fieldErrors?.occupation?.[0]}
            required
          />
          <Input
            label="Employer or business"
            name="employerOrBusiness"
            defaultValue={guarantor.employer_or_business ?? ""}
            placeholder="Optional"
            error={state.fieldErrors?.employerOrBusiness?.[0]}
          />
        </div>

        <CurrencyInput
          label="Average monthly income"
          name="monthlyIncome"
          defaultValue={String(guarantor.monthly_income)}
          placeholder="0.00"
          error={state.fieldErrors?.monthlyIncome?.[0]}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="guarantor-id-type" className="text-sm font-bold text-text-strong">
              Means of ID
            </label>
            <select
              id="guarantor-id-type"
              name="idType"
              defaultValue={guarantor.id_type}
              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
              required
            >
              {ID_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Input
            label="ID number"
            name="idNumber"
            defaultValue={guarantor.id_number}
            error={state.fieldErrors?.idNumber?.[0]}
            required
          />
        </div>

        <div className="rounded-card border border-border-soft bg-surface p-4">
          <p className="text-sm font-black text-text-strong">
            Guarantor responsibility
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Your confirmed record will be attached to the tenancy agreement.
            The property manager may contact you about unpaid rent, property
            damage, or another material tenancy breach. Any obligation is
            subject to the final agreement and applicable law.
          </p>
        </div>

        <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold leading-6 text-text-strong">
          <input
            type="checkbox"
            name="responsibilityAcknowledgement"
            required
            className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
          />
          <span>
            I confirm that these details are correct, understand that my
            confirmed record will form part of the tenancy, and accept the
            guarantor responsibility described above if the tenancy is
            approved.
          </span>
        </label>
      </div>

      <div className="border-t border-border-soft p-5">
        <Button type="submit" isLoading={isPending} fullWidth>
          Confirm guarantor details
        </Button>
      </div>
    </form>
  );
}
