"use client";

import { useActionState } from "react";
import { saveAgreementTemplateAction } from "@/actions/agreement-templates.actions";
import { initialAgreementTemplateActionState } from "@/actions/agreement-templates.state";
import { AGREEMENT_TEMPLATE_PLACEHOLDERS } from "@/lib/agreement-template-default";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";

type AgreementTemplateEditorProps = {
  scope: "landlord" | "property";
  propertyId?: string | null;
  propertyName?: string | null;
  name: string;
  templateBody: string;
};

const placeholderHelp = Object.values(AGREEMENT_TEMPLATE_PLACEHOLDERS).join(", ");

export function AgreementTemplateEditor({
  scope,
  propertyId,
  propertyName,
  name,
  templateBody,
}: AgreementTemplateEditorProps) {
  const [state, formAction, isPending] = useActionState(
    saveAgreementTemplateAction,
    initialAgreementTemplateActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Template saved"
        errorTitle="Could not save template"
      />

      {propertyId ? (
        <input type="hidden" name="propertyId" value={propertyId} />
      ) : null}

      <TrustNotice
        title={
          scope === "property"
            ? `Reusable agreement for ${propertyName ?? "this property"}`
            : "Reusable landlord agreement template"
        }
        description="Use placeholders like {{tenant_name}} and {{rent_amount}}. BOPA fills tenant, unit, rent, and property rule details when you generate an agreement."
      />

      <Input
        label="Template name"
        name="name"
        defaultValue={name}
        error={state.fieldErrors?.name?.[0]}
        required
      />

      <Textarea
        label="Agreement template"
        name="templateBody"
        defaultValue={templateBody}
        rows={18}
        error={state.fieldErrors?.templateBody?.[0]}
        helperText={`Supported placeholders: ${placeholderHelp}`}
        required
      />

      <Button type="submit" isLoading={isPending}>
        Save agreement template
      </Button>
    </form>
  );
}
