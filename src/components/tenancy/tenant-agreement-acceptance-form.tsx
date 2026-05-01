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
};

export function TenantAgreementAcceptanceForm({
  token,
  alreadyAccepted,
}: TenantAgreementAcceptanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    acceptTenancyAgreementAction,
    initialTenancyAgreementActionState,
  );

  if (alreadyAccepted || state.ok) {
    return (
      <Card>
        <CardContent>
          <TrustNotice
            title="Agreement accepted"
            description="Your acceptance has been recorded. You may now contact the landlord for the next step."
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
