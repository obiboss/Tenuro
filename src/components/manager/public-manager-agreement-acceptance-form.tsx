"use client";

import { useActionState } from "react";
import { acceptManagerTenantAgreementAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import type { ManagerTenantAgreementDocumentRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type PublicManagerAgreementAcceptanceFormProps = {
  token: string;
  agreement: ManagerTenantAgreementDocumentRow;
  pdfDownloadUrl: string;
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

export function PublicManagerAgreementAcceptanceForm({
  token,
  agreement,
  pdfDownloadUrl,
}: PublicManagerAgreementAcceptanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    acceptManagerTenantAgreementAction,
    initialManagerTenantOnboardingActionState,
  );

  const accepted = agreement.document_status === "accepted" || state.ok;

  return (
    <div className="space-y-4">
      <a
        href={pdfDownloadUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
      >
        Download Agreement PDF
      </a>

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

      {accepted ? (
        <div className="rounded-button bg-primary-soft p-4">
          <p className="font-black text-text-strong">Agreement accepted</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Your rent payment link is ready. It expires on{" "}
            {formatDateTime(state.paymentExpiresAt)}.
          </p>

          {state.paymentUrl ? (
            <a
              href={state.paymentUrl}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              Continue to Rent Payment
            </a>
          ) : null}
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />

          <Button type="submit" isLoading={isPending} fullWidth>
            I Have Read and Accept This Agreement
          </Button>
        </form>
      )}
    </div>
  );
}
