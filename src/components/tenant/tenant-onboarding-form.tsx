"use client";

import { useActionState } from "react";
import { submitTenantOnboardingAction } from "@/actions/onboarding.actions";
import { initialTenantOnboardingActionState } from "@/actions/onboarding.state";
import { TenantKycFileUpload } from "@/components/tenant/tenant-kyc-file-upload";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import type {
  PropertyRuleDetailRow,
  PropertyRuleMetadata,
} from "@/server/repositories/property-rules.repository";

type TenantOnboardingFormProps = {
  token: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  isSubmitted: boolean;
  isAgentSourced?: boolean;
  requiresVerificationSummary?: boolean;
  propertyRules: PropertyRuleDetailRow[];
};

const idTypeOptions = [
  {
    label: "NIN",
    value: "nin",
  },
  {
    label: "International Passport",
    value: "passport",
  },
  {
    label: "Driver's License",
    value: "drivers_license",
  },
  {
    label: "Voter's Card",
    value: "voters_card",
  },
];

const yesNoOptions = [
  {
    label: "Yes",
    value: "yes",
  },
  {
    label: "No",
    value: "no",
  },
];

const propertyUseOptions = [
  {
    label: "I will live there",
    value: "residential",
  },
  {
    label: "I want to use it for business",
    value: "commercial",
  },
];

const monthlyIncomeRangeOptions = [
  {
    label: "Below ₦100,000",
    value: "below_100000",
  },
  {
    label: "₦100,000 - ₦249,999",
    value: "100000_249999",
  },
  {
    label: "₦250,000 - ₦499,999",
    value: "250000_499999",
  },
  {
    label: "₦500,000 - ₦999,999",
    value: "500000_999999",
  },
  {
    label: "₦1,000,000 - ₦1,999,999",
    value: "1000000_1999999",
  },
  {
    label: "₦2,000,000 and above",
    value: "2000000_and_above",
  },
];

function getRuleCode(rule: PropertyRuleDetailRow) {
  const metadata = rule.metadata as PropertyRuleMetadata | null;

  return metadata?.rule_code ?? null;
}

function hasRule(rules: PropertyRuleDetailRow[], ruleCode: string) {
  return rules.some(
    (rule) =>
      rule.status === "active" &&
      rule.enforcement !== "information_only" &&
      getRuleCode(rule) === ruleCode,
  );
}

function DynamicKycChecks({
  rules,
  fieldErrors,
}: {
  rules: PropertyRuleDetailRow[];
  fieldErrors?: Record<string, string[]>;
}) {
  const hasAnyCheck = rules.some(
    (rule) =>
      rule.status === "active" && rule.enforcement !== "information_only",
  );

  if (!hasAnyCheck) {
    return null;
  }

  return (
    <div className="space-y-5 rounded-card bg-background p-5">
      <TrustNotice
        title="A few questions from the landlord"
        description="Only answer the questions shown here. These are based on what the landlord selected for this apartment."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {hasRule(rules, "pets_not_allowed") ? (
          <Select
            label="Do you have pets?"
            name="hasPets"
            options={yesNoOptions}
            error={fieldErrors?.hasPets?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "maximum_occupants") ? (
          <Input
            label="How many people will live here?"
            name="occupantCount"
            type="number"
            min={1}
            placeholder="Example: 4"
            error={fieldErrors?.occupantCount?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "residential_only") ? (
          <Select
            label="How will you use this property?"
            name="propertyUse"
            options={propertyUseOptions}
            error={fieldErrors?.propertyUse?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "children_under_5_not_allowed") ? (
          <Select
            label="Will children under 5 live here?"
            name="hasChildrenUnderFive"
            options={yesNoOptions}
            error={fieldErrors?.hasChildrenUnderFive?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "minimum_monthly_income") ? (
          <Select
            label="What is your monthly income or regular cashflow?"
            name="monthlyIncomeRange"
            options={monthlyIncomeRangeOptions}
            error={fieldErrors?.monthlyIncomeRange?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "guarantor_required") ? (
          <Select
            label="Can you provide a guarantor if approved?"
            name="canProvideGuarantor"
            options={yesNoOptions}
            helperText="You do not need to fill guarantor details now."
            error={fieldErrors?.canProvideGuarantor?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "shortlet_not_allowed") ? (
          <Select
            label="Will you use this place for short-let or Airbnb?"
            name="willUseShortlet"
            options={yesNoOptions}
            error={fieldErrors?.willUseShortlet?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "subletting_not_allowed") ? (
          <Select
            label="Will you rent it out to someone else?"
            name="willSublet"
            options={yesNoOptions}
            error={fieldErrors?.willSublet?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "customer_facing_business_not_allowed") ? (
          <Select
            label="Will your business bring customers, staff, or many visitors?"
            name="willRunCustomerFacingBusiness"
            options={yesNoOptions}
            error={fieldErrors?.willRunCustomerFacingBusiness?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "heavy_generator_or_equipment_not_allowed") ? (
          <Select
            label="Will you use heavy generator, machines, or large equipment?"
            name="willUseHeavyGeneratorOrEquipment"
            options={yesNoOptions}
            error={fieldErrors?.willUseHeavyGeneratorOrEquipment?.[0]}
            required
          />
        ) : null}

        {hasRule(rules, "large_gatherings_not_allowed") ? (
          <Select
            label="Will you hold regular parties or large gatherings?"
            name="willHostLargeGatherings"
            options={yesNoOptions}
            error={fieldErrors?.willHostLargeGatherings?.[0]}
            required
          />
        ) : null}
      </div>
    </div>
  );
}

export function TenantOnboardingForm({
  token,
  fullName,
  phoneNumber,
  email,
  isSubmitted,
  isAgentSourced = false,
  requiresVerificationSummary = false,
  propertyRules,
}: TenantOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitTenantOnboardingAction,
    initialTenantOnboardingActionState,
  );

  const submitted =
    isSubmitted || (state.ok && state.nextStep === "submitted");

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

  if (state.ok && state.nextStep === "verification_summary") {
    return (
      <Card>
        <CardContent>
          <TrustNotice
            title="Application saved"
            description="Your KYC details have been saved. Continue below to complete verification and processing."
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
        successTitle={
          isAgentSourced ? "Application saved" : "Profile submitted"
        }
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

          <div className="grid gap-4 md:grid-cols-2">
            <TenantKycFileUpload
              token={token}
              documentType="tenant_id_document"
              label="ID document"
              name="idDocumentPath"
              required
              error={state.fieldErrors?.idDocumentPath?.[0]}
            />

            <TenantKycFileUpload
              token={token}
              documentType="tenant_passport_photo"
              label="Passport photo"
              name="passportPhotoPath"
              required
              helperText="Upload a clear passport photo or headshot."
              error={state.fieldErrors?.passportPhotoPath?.[0]}
            />
          </div>

          <DynamicKycChecks
            rules={propertyRules}
            fieldErrors={state.fieldErrors}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            {requiresVerificationSummary || isAgentSourced
              ? "Save and Continue to Verification"
              : "Submit Tenant Profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
