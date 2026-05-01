"use client";

import { useActionState } from "react";
import {
  finalizeTenancyAgreementAction,
  generateTenancyAgreementAction,
  refreshTenancyAgreementAcceptanceLinkAction,
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

function getStatusLabel(
  status: TenancyAgreementDocumentRow["document_status"],
) {
  const labels: Record<TenancyAgreementDocumentRow["document_status"], string> =
    {
      draft: "Draft",
      finalized: "Finalized",
      sent_to_tenant: "Sent to tenant",
      accepted: "Accepted",
      voided: "Voided",
    };

  return labels[status];
}

function getStatusTone(status: TenancyAgreementDocumentRow["document_status"]) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "voided") {
    return "danger" as const;
  }

  if (status === "draft") {
    return "primary" as const;
  }

  return "warning" as const;
}

function AgreementLinkBox({ url }: { url?: string }) {
  if (!url) {
    return null;
  }

  return (
    <div className="rounded-button bg-success-soft p-4">
      <p className="text-sm font-extrabold text-success">
        Tenant acceptance link
      </p>
      <p className="mt-2 break-all text-sm font-semibold leading-6 text-text-strong">
        {url}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Copy and send this link to the tenant on WhatsApp.
      </p>
    </div>
  );
}

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

  const [finalizeState, finalizeFormAction, isFinalizing] = useActionState(
    finalizeTenancyAgreementAction,
    initialTenancyAgreementActionState,
  );

  const [linkState, linkFormAction, isPreparingLink] = useActionState(
    refreshTenancyAgreementAcceptanceLinkAction,
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

  const isDraft = agreement.document_status === "draft";
  const canPrepareLink =
    agreement.document_status === "finalized" ||
    agreement.document_status === "sent_to_tenant";

  return (
    <Card>
      <ActionResultToast
        ok={saveState.ok}
        message={saveState.message}
        successTitle="Agreement saved"
        errorTitle="Agreement save failed"
      />

      <ActionResultToast
        ok={finalizeState.ok}
        message={finalizeState.message}
        successTitle="Agreement finalized"
        errorTitle="Finalization failed"
      />

      <ActionResultToast
        ok={linkState.ok}
        message={linkState.message}
        successTitle="Acceptance link prepared"
        errorTitle="Link preparation failed"
      />

      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tenancy Agreement Document</CardTitle>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Review the draft, finalize it, then send the tenant acceptance
              link.
            </p>
          </div>

          <Badge tone={getStatusTone(agreement.document_status)}>
            {getStatusLabel(agreement.document_status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <AgreementLinkBox
            url={finalizeState.acceptanceUrl || linkState.acceptanceUrl}
          />

          {isDraft ? (
            <form action={saveFormAction} className="space-y-4">
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

              <Button type="submit" isLoading={isSaving} fullWidth>
                Save Agreement Draft
              </Button>
            </form>
          ) : (
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-extrabold text-text-strong">
                Final agreement content
              </p>
              <pre className="mt-3 max-h-140 overflow-auto whitespace-pre-wrap rounded-button bg-white p-4 text-sm leading-7 text-text-normal ring-1 ring-border-soft">
                {agreement.finalized_body || agreement.agreement_body}
              </pre>
            </div>
          )}

          {isDraft ? (
            <form action={finalizeFormAction}>
              <input type="hidden" name="agreementId" value={agreement.id} />

              <Button
                type="submit"
                variant="secondary"
                isLoading={isFinalizing}
                fullWidth
              >
                Finalize and Prepare Tenant Link
              </Button>
            </form>
          ) : null}

          {canPrepareLink ? (
            <form action={linkFormAction}>
              <input type="hidden" name="agreementId" value={agreement.id} />

              <Button
                type="submit"
                variant="secondary"
                isLoading={isPreparingLink}
                fullWidth
              >
                Prepare New Acceptance Link
              </Button>
            </form>
          ) : null}

          {agreement.document_status === "accepted" ? (
            <TrustNotice
              title="Agreement accepted"
              description="The tenant has accepted this agreement digitally. PDF generation and download will be added in the next batch."
            />
          ) : (
            <TrustNotice
              title="Acceptance before payment"
              description="After the tenant accepts the agreement, the next step is to send the tenant rent payment link."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
