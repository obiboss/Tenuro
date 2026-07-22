"use client";

import { useActionState } from "react";
import { submitExistingTenantClaimAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  RENT_PAYMENT_FREQUENCY_LABELS,
  type RentPaymentFrequency,
} from "@/lib/rent-cycle";

type ExistingTenantClaimPublicFormProps = {
  token: string;
  invitedName: string | null;
  invitedPhoneNumber: string | null;
  invitedEmail: string | null;
  rentAmount: number;
  rentFrequency: RentPaymentFrequency;
};

const idTypeOptions = [
  { label: "NIN", value: "nin" },
  { label: "International Passport", value: "passport" },
  { label: "Driver's License", value: "drivers_license" },
  { label: "Voter's Card", value: "voters_card" },
];

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function ExistingTenantClaimPublicForm({
  token,
  invitedName,
  invitedPhoneNumber,
  invitedEmail,
  rentAmount,
  rentFrequency,
}: ExistingTenantClaimPublicFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  if (state.ok) {
    return <TrustNotice title="Details submitted" description="Your details have been submitted. Your landlord will review and confirm your tenancy shortly." />;
  }

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast ok={state.ok} message={state.message} successTitle="Details submitted" errorTitle="Please check this form" />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="paymentFrequency" value={rentFrequency} />
      <input type="hidden" name="claimedRentAmount" value={rentAmount} />

      <TrustNotice
        title="Confirm your details"
        description="The rent amount and collection frequency were set by the landlord. Enter the date you first moved in; BOPA will calculate the due date automatically."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-button border border-border-soft bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Agreed rent</p>
          <p className="mt-2 text-lg font-black text-text-strong">{formatNaira(rentAmount)}</p>
        </div>
        <div className="rounded-button border border-border-soft bg-background p-4">
          <p className="text-sm font-bold text-text-muted">Rent collection</p>
          <p className="mt-2 text-lg font-black text-text-strong">{RENT_PAYMENT_FREQUENCY_LABELS[rentFrequency]}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Full name" name="fullName" defaultValue={invitedName ?? ""} error={state.fieldErrors?.fullName?.[0]} required />
        <Input label="Phone number" name="phoneNumber" defaultValue={invitedPhoneNumber ?? ""} error={state.fieldErrors?.phoneNumber?.[0]} required />
      </div>
      <Input label="Email" name="email" type="email" defaultValue={invitedEmail ?? ""} placeholder="Optional" error={state.fieldErrors?.email?.[0]} />
      <Input label="Occupation" name="occupation" placeholder="Optional. Example: Trader, Accountant" error={state.fieldErrors?.occupation?.[0]} />
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Means of identification" name="idType" options={idTypeOptions} error={state.fieldErrors?.idType?.[0]} required />
        <Input label="ID number" name="idNumber" placeholder="Enter the selected ID number" error={state.fieldErrors?.idNumber?.[0]} required />
      </div>
      <Input
        label="Original move-in date"
        name="moveInDate"
        type="date"
        helperText="Use the date you first moved into this apartment, not the date you paid."
        error={state.fieldErrors?.moveInDate?.[0]}
        required
      />
      <Textarea label="Additional note" name="tenantNotes" placeholder="Optional. Add anything the landlord should know." error={state.fieldErrors?.tenantNotes?.[0]} />
      <Button type="submit" isLoading={isPending} fullWidth>Submit for Landlord Review</Button>
    </form>
  );
}
