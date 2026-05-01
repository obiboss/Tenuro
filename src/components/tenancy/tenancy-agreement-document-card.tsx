"use client";

import { useActionState } from "react";
import {
  generateTenancyAgreementAction,
  saveTenancyAgreementDraftAction,
} from "@/actions/tenancy-agreements.actions";
import { initialTenancyAgreementActionState } from "@/actions/tenancy-agreement.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { TenancyAgreementDocumentRow } from "@/server/repositories/tenancy-agreements.repository";

type TenancyAgreementDocumentCardProps = {
  tenancyId: string;
  agreement: TenancyAgreementDocumentRow | null;
};

export function TenancyAgreementDocumentCard({
  tenancyId,
  agreement,
}: TenancyAgreementDocumentCardProps) {
  const [generateState, generateFormAction, isGenerating] = useActionState(
    generateTenancyAgreementAction,
    initialTenancyAgreementActionState,
  );

  const [saveState, saveFormAction, isSaving] = useActionState(
    saveTenancyAgreementDraftAction,
    initialTenancyAgreementActionState,
  );

  if (!agreement) {
    return (
      <Card>
        <ActionResultToast
          ok={generateState.ok}
          message={generateState.message}
          successTitle="Agreement generated"
          errorTitle="Agreement generation failed"
        />

        <CardHeader>
          <CardTitle>Tenancy Agreement Document</CardTitle>
        </CardHeader>

        <CardContent>
          <TrustNotice
            title="Generate full agreement"
            description="Create a complete tenancy agreement document using the landlord, tenant, property, rent, dates, and standard Nigerian tenancy clauses."
          />

          {generateState.message ? (
            <div
              role="alert"
              className={
                generateState.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {generateState.message}
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <form action={generateFormAction} className="w-full">
            <input type="hidden" name="tenancyId" value={tenancyId} />

            <Button type="submit" isLoading={isGenerating} fullWidth>
              Generate Agreement Draft
            </Button>
          </form>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <ActionResultToast
        ok={saveState.ok}
        message={saveState.message}
        successTitle="Agreement saved"
        errorTitle="Agreement save failed"
      />

      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tenancy Agreement Document</CardTitle>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Review and edit the agreement draft before sending it to the
              tenant.
            </p>
          </div>

          <Badge tone="primary">
            {agreement.document_status === "draft"
              ? "Draft"
              : agreement.document_status}
          </Badge>
        </div>
      </CardHeader>

      <form action={saveFormAction}>
        <CardContent>
          {saveState.message ? (
            <div
              role="alert"
              className={
                saveState.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {saveState.message}
            </div>
          ) : null}

          <input type="hidden" name="agreementId" value={agreement.id} />

          <Textarea
            label="Agreement content"
            name="agreementBody"
            defaultValue={agreement.agreement_body}
            rows={28}
            className="font-mono text-sm leading-6"
            error={saveState.fieldErrors?.agreementBody?.[0]}
            required
          />

          <TrustNotice
            title="Draft only"
            description="Saving here updates the draft. Finalization, tenant acceptance link, PDF generation, and WhatsApp delivery come in the next batch."
          />
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={agreement.document_status !== "draft"}
            fullWidth
          >
            Save Agreement Draft
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
