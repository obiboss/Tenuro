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
    return "available for 24 hours";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function getTenantSafeMessage(message: string | undefined) {
  if (!message) {
    return null;
  }

  if (
    message.toLowerCase().includes("payout account") ||
    message.toLowerCase().includes("subaccount") ||
    message.toLowerCase().includes("paystack")
  ) {
    return "Payment is not ready yet. Please contact the property manager.";
  }

  return message;
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
  const safeMessage = getTenantSafeMessage(state.message);

  return (
    <section className="rounded-card border border-border-soft bg-white p-4 shadow-sm">
      <div>
        <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
          Agreement
        </p>

        <h2 className="mt-4 text-lg font-black tracking-tight text-text-strong">
          Review and accept
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Download the agreement, review it, then accept to continue to payment.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <a
          href={pdfDownloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
        >
          Download Agreement PDF
        </a>

        {safeMessage ? (
          <div
            role="alert"
            className={
              state.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {safeMessage}
          </div>
        ) : null}

        {accepted ? (
          <div className="rounded-button bg-success-soft p-4">
            <p className="font-black text-text-strong">Agreement accepted</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Your rent payment button is ready. Please complete payment before{" "}
              {formatDateTime(state.paymentExpiresAt)}.
            </p>

            {state.paymentUrl ? (
              <a
                href={state.paymentUrl}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
              >
                Pay First Rent
              </a>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
                Payment is not ready yet. Please contact the property manager.
              </p>
            )}
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="token" value={token} />

            <Button type="submit" isLoading={isPending} fullWidth>
              Accept Agreement
            </Button>
          </form>
        )}

        {!accepted ? (
          <div className="rounded-card bg-warning-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Payment follows acceptance
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              After acceptance, the first rent payment button will appear on
              this page.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
