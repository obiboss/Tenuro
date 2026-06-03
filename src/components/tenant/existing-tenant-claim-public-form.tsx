"use client";

import { useActionState } from "react";
import { submitExistingTenantClaimAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type ExistingTenantClaimPublicFormProps = {
  token: string;
  invitedName: string | null;
  invitedPhoneNumber: string | null;
  invitedEmail: string | null;
};

const paymentFrequencyOptions = [
  {
    label: "Annual rent",
    value: "annual",
  },
  {
    label: "Monthly rent",
    value: "monthly",
  },
  {
    label: "Quarterly rent",
    value: "quarterly",
  },
  {
    label: "Biannual rent",
    value: "biannual",
  },
];

export function ExistingTenantClaimPublicForm({
  token,
  invitedName,
  invitedPhoneNumber,
  invitedEmail,
}: ExistingTenantClaimPublicFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  if (state.ok) {
    return (
      <TrustNotice
        title="Details submitted"
        description="Your tenancy details have been sent to the landlord. The landlord will review the rent amount and due date before confirming the final record."
      />
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Details submitted"
        errorTitle="Please check this form"
      />

      <input type="hidden" name="token" value={token} />

      <TrustNotice
        title="Confirm your tenancy details"
        description="Your landlord will review these details before they become the official tenancy record."
      />

      {state.message ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Full name"
          name="fullName"
          defaultValue={invitedName ?? ""}
          error={state.fieldErrors?.fullName?.[0]}
          required
        />

        <Input
          label="Phone number"
          name="phoneNumber"
          defaultValue={invitedPhoneNumber ?? ""}
          error={state.fieldErrors?.phoneNumber?.[0]}
          required
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={invitedEmail ?? ""}
        placeholder="Optional"
        error={state.fieldErrors?.email?.[0]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Move-in date"
          name="moveInDate"
          type="date"
          error={state.fieldErrors?.moveInDate?.[0]}
          required
        />

        <Input
          label="Next rent due date"
          name="claimedNextRentDueDate"
          type="date"
          error={state.fieldErrors?.claimedNextRentDueDate?.[0]}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyInput
          label="Current rent amount"
          name="claimedRentAmount"
          placeholder="0.00"
          error={state.fieldErrors?.claimedRentAmount?.[0]}
          required
        />

        <Select
          label="Payment frequency"
          name="paymentFrequency"
          options={paymentFrequencyOptions}
          defaultValue="annual"
          error={state.fieldErrors?.paymentFrequency?.[0]}
          required
        />
      </div>

      <Textarea
        label="Additional note"
        name="tenantNotes"
        placeholder="Optional. Add anything the landlord should know."
        error={state.fieldErrors?.tenantNotes?.[0]}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Submit for Landlord Review
      </Button>
    </form>
  );
}
