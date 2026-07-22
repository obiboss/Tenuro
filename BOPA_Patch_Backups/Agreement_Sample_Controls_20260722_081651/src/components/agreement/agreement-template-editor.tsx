"use client";

import { useActionState, useState } from "react";
import { saveAgreementTemplateAction } from "@/actions/agreement-templates.actions";
import type { AgreementTemplateActionState } from "@/actions/agreement-templates.state";
import { initialAgreementTemplateActionState } from "@/actions/agreement-templates.state";
import { AGREEMENT_TEMPLATE_PLACEHOLDERS } from "@/lib/agreement-template-default";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type AgreementTemplateEditorProps = {
  scope: "landlord" | "property";
  propertyId?: string | null;
  propertyName?: string | null;
  name: string;
  templateBody: string;
};

const agreementFieldLabels = [
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordName, "[Landlord name]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordPhone, "[Landlord phone number]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordEmail, "[Landlord email]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantName, "[Tenant name]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantPhone, "[Tenant phone number]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantEmail, "[Tenant email]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyName, "[Property name]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyAddress, "[Property address]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.unitIdentifier, "[Unit or apartment]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.rentAmount, "[Rent amount]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.rentFrequency, "[Rent period]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.startDate, "[Start date]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.endDate, "[End date]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyRequirements, "[Property rules]"],
  [AGREEMENT_TEMPLATE_PLACEHOLDERS.specialTerms, "[Special terms]"],
] as const;

function showAgreementFieldsInPlainLanguage(template: string) {
  return agreementFieldLabels.reduce(
    (result, [storedValue, visibleLabel]) =>
      result.replaceAll(storedValue, visibleLabel),
    template,
  );
}

function restoreAgreementFieldsForSaving(template: string) {
  return agreementFieldLabels.reduce(
    (result, [storedValue, visibleLabel]) =>
      result.replaceAll(visibleLabel, storedValue),
    template,
  );
}

async function savePlainLanguageAgreementAction(
  previousState: AgreementTemplateActionState,
  formData: FormData,
) {
  const templateBody = formData.get("templateBody");

  if (typeof templateBody === "string") {
    formData.set("templateBody", restoreAgreementFieldsForSaving(templateBody));
  }

  return saveAgreementTemplateAction(previousState, formData);
}

export function AgreementTemplateEditor({
  scope,
  propertyId,
  propertyName,
  name,
  templateBody,
}: AgreementTemplateEditorProps) {
  const [state, formAction, isPending] = useActionState(
    savePlainLanguageAgreementAction,
    initialAgreementTemplateActionState,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [agreementText, setAgreementText] = useState(() =>
    showAgreementFieldsInPlainLanguage(templateBody),
  );

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Agreement wording saved"
        errorTitle="Could not save agreement wording"
      />

      {propertyId ? (
        <input type="hidden" name="propertyId" value={propertyId} />
      ) : null}
      <input type="hidden" name="name" value={name} />

      <TrustNotice
        title={
          scope === "property"
            ? `Agreement for ${propertyName ?? "this property"}`
            : "Your tenancy agreement"
        }
        description="This is the wording your tenant will read. BOPA adds the correct names, property, rent, dates, and rules when you prepare an agreement."
      />

      {isEditing ? (
        <>
          <Textarea
            label="Agreement wording"
            name="templateBody"
            value={agreementText}
            onChange={(event) => setAgreementText(event.target.value)}
            rows={22}
            error={state.fieldErrors?.templateBody?.[0]}
            helperText="BOPA fills in the words inside square brackets for each tenant. Leave those labels in place and change only the wording you want."
            required
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" isLoading={isPending}>
              Save agreement wording
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="max-h-[34rem] overflow-y-auto rounded-card border border-border-soft bg-white px-4 py-5 text-sm font-medium leading-7 whitespace-pre-wrap text-text-strong sm:px-5">
            {agreementText}
          </div>

          <Button type="button" onClick={() => setIsEditing(true)}>
            Edit agreement wording
          </Button>
        </>
      )}
    </form>
  );
}
