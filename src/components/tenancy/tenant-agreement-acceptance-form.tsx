"use client";

import { useActionState } from "react";
import { acceptTenancyAgreementAction } from "@/actions/tenancy-agreements.actions";
import { initialTenancyAgreementActionState } from "@/actions/tenancy-agreement.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenantAgreementAcceptanceFormProps = {
  token: string;
  alreadyAccepted: boolean;
  pdfDownloadUrl: string | null;
};

export function TenantAgreementAcceptanceForm({
  token,
  alreadyAccepted,
  pdfDownloadUrl,
}: TenantAgreementAcceptanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    acceptTenancyAgreementAction,
    initialTenancyAgreementActionState,
  );

  const downloadUrl = state.pdfDownloadUrl || pdfDownloadUrl;

  if (alreadyAccepted || state.ok) {
    return (
      <Card>
        <CardContent>
          <TrustNotice
            title="Agreement accepted"
            description="Your acceptance has been recorded. You can download the accepted agreement PDF below."
          />

          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
            >
              Download Agreement PDF
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Agreement accepted"
        errorTitle="Acceptance failed"
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
            title="Digital acceptance"
            description="By clicking accept, you confirm that you have read and accepted this tenancy agreement. The acceptance timestamp and device details will be stored."
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            I Have Read and Accept This Agreement
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
