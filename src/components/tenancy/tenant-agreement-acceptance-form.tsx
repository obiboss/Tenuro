"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

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
  const paymentUrl = state.tenantPaymentUrl;
  const needsGuarantor = state.needsGuarantor;

  if (alreadyAccepted || state.ok) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-4">
            <TrustNotice
              title="Agreement accepted"
              description="Your acceptance has been recorded. You can download the accepted agreement PDF below."
            />

            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
              >
                Download Agreement PDF
              </a>
            ) : null}

            {needsGuarantor ? (
              <TrustNotice
                title="Guarantor details required"
                description="Your agreement has been accepted. Please complete your guarantor details before the rent payment link is shown."
              />
            ) : null}

            {paymentUrl ? (
              <div className="rounded-button bg-primary-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                    <CreditCard
                      aria-hidden="true"
                      size={20}
                      strokeWidth={2.6}
                    />
                  </div>

                  <div>
                    <p className="font-black text-text-strong">
                      First rent payment is ready
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      This checkout expires on{" "}
                      {formatDateTime(state.paymentExpiresAt)}.
                    </p>
                  </div>
                </div>

                <a
                  href={paymentUrl}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
                >
                  Continue to Rent Payment
                </a>
              </div>
            ) : null}
          </div>
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
            description="By clicking accept, you confirm that you have read and accepted this tenancy agreement. If guarantor details are required, you will complete them before rent payment."
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
