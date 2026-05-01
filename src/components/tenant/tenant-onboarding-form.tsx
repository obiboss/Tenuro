"use client";

import { useActionState } from "react";
import { submitTenantOnboardingAction } from "@/actions/onboarding.actions";
import { initialTenantOnboardingActionState } from "@/actions/onboarding.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenantOnboardingFormProps = {
  token: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  isSubmitted: boolean;
};

const idTypeOptions = [
  { label: "NIN", value: "nin" },
  { label: "International Passport", value: "passport" },
  { label: "Driver's License", value: "drivers_license" },
  { label: "Voter's Card", value: "voters_card" },
];

export function TenantOnboardingForm({
  token,
  fullName,
  phoneNumber,
  email,
  isSubmitted,
}: TenantOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitTenantOnboardingAction,
    initialTenantOnboardingActionState,
  );

  const submitted = isSubmitted || state.ok;

  if (submitted) {
    return (
      <Card>
        <CardContent>
          <TrustNotice
            title="Profile submitted"
            description="Your tenant profile has been submitted successfully. The landlord will review it and contact you with the next step."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Profile submitted"
        errorTitle="Please check this form"
      />

      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className={
                state.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {state.message}
            </div>
          ) : null}

          <input type="hidden" name="token" value={token} />

          <TrustNotice
            title="Tenant KYC"
            description="Complete your profile carefully. The landlord will review these details before preparing the tenancy agreement."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              name="fullName"
              defaultValue={fullName}
              error={state.fieldErrors?.fullName?.[0]}
              required
            />

            <Input
              label="Phone number"
              name="phoneNumber"
              defaultValue={phoneNumber}
              error={state.fieldErrors?.phoneNumber?.[0]}
              required
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={email ?? ""}
            placeholder="Optional"
            error={state.fieldErrors?.email?.[0]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              error={state.fieldErrors?.dateOfBirth?.[0]}
              required
            />

            <Input
              label="Occupation"
              name="occupation"
              placeholder="Example: Accountant"
              error={state.fieldErrors?.occupation?.[0]}
              required
            />
          </div>

          <Input
            label="Employer / Business name"
            name="employer"
            placeholder="Optional"
            error={state.fieldErrors?.employer?.[0]}
          />

          <Textarea
            label="Current home address"
            name="homeAddress"
            placeholder="Enter your current residential address"
            error={state.fieldErrors?.homeAddress?.[0]}
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="ID type"
              name="idType"
              options={idTypeOptions}
              error={state.fieldErrors?.idType?.[0]}
              required
            />

            <Input
              label="ID number"
              name="idNumber"
              placeholder="Enter your selected ID number"
              error={state.fieldErrors?.idNumber?.[0]}
              helperText="This is encrypted before being stored."
              required
            />
          </div>

          <div className="rounded-button bg-background p-4">
            <p className="font-extrabold text-text-strong">
              Guarantor Information
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Provide someone the landlord can contact as your guarantor.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Guarantor full name"
              name="guarantorFullName"
              error={state.fieldErrors?.guarantorFullName?.[0]}
              required
            />

            <Input
              label="Guarantor phone number"
              name="guarantorPhoneNumber"
              error={state.fieldErrors?.guarantorPhoneNumber?.[0]}
              required
            />
          </div>

          <Input
            label="Guarantor email"
            name="guarantorEmail"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.guarantorEmail?.[0]}
          />

          <Input
            label="Relationship to you"
            name="guarantorRelationshipToTenant"
            placeholder="Example: Brother, Employer, Pastor"
            error={state.fieldErrors?.guarantorRelationshipToTenant?.[0]}
            required
          />

          <Textarea
            label="Guarantor address"
            name="guarantorAddress"
            placeholder="Enter guarantor address"
            error={state.fieldErrors?.guarantorAddress?.[0]}
            required
          />

          <TrustNotice
            title="Document upload comes next"
            description="ID document and passport photo upload will be enabled in the next onboarding batch."
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Submit Tenant Profile
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
