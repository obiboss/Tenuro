"use client";

import { useActionState } from "react";
import {
  acceptManagerTenantAgreementAction,
  declineManagerTenantAgreementAction,
} from "@/actions/manager-tenant-onboarding.actions";
import {
  initialManagerTenantOnboardingActionState,
  type ManagerTenantPaymentBreakdownState,
} from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import {
  getManagerAgreementGuarantors,
  getManagerAgreementRequirementSnapshots,
} from "@/lib/manager-tenancy-agreement-snapshots";
import type { ManagerTenantAgreementDocumentRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type PublicManagerAgreementAcceptanceFormProps = {
  token: string;
  agreement: ManagerTenantAgreementDocumentRow;
  pdfDownloadUrl: string | null;
  initialPaymentRequestId?: string | null;
  initialPaymentUrl?: string | null;
  initialPaymentExpiresAt?: string | null;
  initialPaymentBreakdown?: ManagerTenantPaymentBreakdownState | null;
};

type AgreementRuleItem = {
  id: string;
  title: string;
  description: string;
  appliesTo: "all_tenants" | "new_tenants" | "renewing_tenants";
  requiresTenantAcknowledgement: boolean;
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

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function getTenantSafeMessage(message: string | undefined) {
  if (!message) {
    return null;
  }

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("payout account") ||
    lowerMessage.includes("subaccount") ||
    lowerMessage.includes("paystack")
  ) {
    return "Payment is not ready yet. Please contact the property manager.";
  }

  return message;
}

function getSnapshotNumber(
  snapshot: Record<string, unknown>,
  key: string,
  fallback = 0,
) {
  const value = snapshot[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function buildFallbackPaymentBreakdown(
  agreement: ManagerTenantAgreementDocumentRow,
): ManagerTenantPaymentBreakdownState {
  const rentAmount = getSnapshotNumber(
    agreement.tenancy_snapshot,
    "rentAmount",
  );

  return {
    currencyCode: "NGN",
    rentAmount,
    serviceChargeItems: [],
    serviceChargeTotal: 0,
    bopaPlatformFee: 0,
    paystackCharge: 0,
    otherCharges: 0,
    managerCommission: 0,
    landlordShare: rentAmount,
    totalPayable: rentAmount,
    collectionMode: "manager_collects",
    paystackChargeBearer: "tenant",
  };
}

function getAgreementRules(
  agreement: ManagerTenantAgreementDocumentRow,
): AgreementRuleItem[] {
  const rawRules =
    agreement.property_snapshot.propertyRules ??
    agreement.tenancy_snapshot.propertyRules;

  if (!Array.isArray(rawRules)) {
    return [];
  }

  return rawRules.flatMap((rawRule) => {
    if (typeof rawRule !== "object" || rawRule === null) {
      return [];
    }

    const rule = rawRule as Record<string, unknown>;
    const title = typeof rule.title === "string" ? rule.title.trim() : "";
    const description =
      typeof rule.description === "string" ? rule.description.trim() : "";

    if (!title || !description) {
      return [];
    }

    return [
      {
        id: typeof rule.id === "string" ? rule.id : title,
        title,
        description,
        appliesTo:
          rule.appliesTo === "all_tenants" ||
          rule.appliesTo === "renewing_tenants"
            ? rule.appliesTo
            : "new_tenants",
        requiresTenantAcknowledgement:
          rule.requiresTenantAcknowledgement !== false,
      },
    ];
  });
}

function getAppliesToLabel(value: AgreementRuleItem["appliesTo"]) {
  if (value === "all_tenants") {
    return "All tenants";
  }

  if (value === "renewing_tenants") {
    return "Renewing tenants";
  }

  return "New tenants";
}

function PaymentSummaryCard({
  breakdown,
}: {
  breakdown: ManagerTenantPaymentBreakdownState;
}) {
  return (
    <div className="rounded-card border border-border-soft bg-white p-4">
      <div>
        <p className="text-base font-black text-text-strong">Payment summary</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Review this amount before continuing to secure payment.
        </p>
      </div>

      <div className="mt-4 divide-y divide-border-soft overflow-hidden rounded-card border border-border-soft bg-surface">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-bold text-text-muted">Rent amount</span>
          <span className="text-sm font-black text-text-strong">
            {formatMoney(breakdown.rentAmount)}
          </span>
        </div>

        {breakdown.serviceChargeItems.map((item) => (
          <div
            key={`${item.chargeId}-${item.name}`}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-sm font-bold text-text-muted">
              {item.name}
            </span>
            <span className="text-sm font-black text-text-strong">
              {formatMoney(item.amount)}
            </span>
          </div>
        ))}

        {breakdown.serviceChargeTotal > 0 ? (
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-bold text-text-muted">
              Service-charge total
            </span>
            <span className="text-sm font-black text-text-strong">
              {formatMoney(breakdown.serviceChargeTotal)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-bold text-text-muted">BOPA charge</span>
          <span className="text-sm font-black text-text-strong">
            {formatMoney(breakdown.bopaPlatformFee)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-bold text-text-muted">
            Paystack charge
          </span>
          <span className="text-sm font-black text-text-strong">
            {formatMoney(breakdown.paystackCharge)}
          </span>
        </div>

        {breakdown.otherCharges > 0 ? (
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-bold text-text-muted">
              Other charges
            </span>
            <span className="text-sm font-black text-text-strong">
              {formatMoney(breakdown.otherCharges)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 bg-white px-4 py-4">
          <span className="text-base font-black text-text-strong">
            Total payable
          </span>
          <span className="text-lg font-black text-primary">
            {formatMoney(breakdown.totalPayable)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PublicManagerAgreementAcceptanceForm({
  token,
  agreement,
  pdfDownloadUrl,
  initialPaymentUrl = null,
  initialPaymentExpiresAt = null,
  initialPaymentBreakdown = null,
}: PublicManagerAgreementAcceptanceFormProps) {
  const [acceptState, acceptAction, isAccepting] = useActionState(
    acceptManagerTenantAgreementAction,
    initialManagerTenantOnboardingActionState,
  );

  const [declineState, declineAction, isDeclining] = useActionState(
    declineManagerTenantAgreementAction,
    initialManagerTenantOnboardingActionState,
  );

  const accepted = agreement.document_status === "accepted" || acceptState.ok;
  const declined =
    agreement.document_status === "voided" || declineState.agreementDeclined;

  const safeAcceptMessage = getTenantSafeMessage(acceptState.message);
  const safeDeclineMessage = getTenantSafeMessage(declineState.message);

  const paymentUrl = acceptState.paymentUrl ?? initialPaymentUrl;
  const paymentExpiresAt =
    acceptState.paymentExpiresAt ?? initialPaymentExpiresAt;
  const paymentBreakdown =
    acceptState.paymentBreakdown ??
    initialPaymentBreakdown ??
    buildFallbackPaymentBreakdown(agreement);
  const agreementPdfUrl = acceptState.pdfDownloadUrl ?? pdfDownloadUrl;

  const hasTriedPreparingPayment =
    acceptState.ok || agreement.document_status === "accepted";
  const agreementRules = getAgreementRules(agreement);
  const agreementRequirements =
    getManagerAgreementRequirementSnapshots(agreement);
  const guarantors = getManagerAgreementGuarantors(agreement);
  const requiresRuleAcknowledgement = agreementRules.some(
    (rule) => rule.requiresTenantAcknowledgement,
  );

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
          Read the agreement, approved requirements, and guarantor record
          before accepting.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {agreementPdfUrl ? (
          <a
            href={agreementPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Download agreement
          </a>
        ) : null}

        {safeAcceptMessage ? (
          <div
            role="alert"
            className={
              acceptState.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {safeAcceptMessage}
          </div>
        ) : null}

        {safeDeclineMessage ? (
          <div
            role="alert"
            className={
              declineState.ok
                ? "rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold text-warning"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {safeDeclineMessage}
          </div>
        ) : null}

        {declined ? (
          <div className="rounded-button bg-warning-soft p-4">
            <p className="font-black text-text-strong">Agreement declined</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              The property manager has been notified. This unit is no longer
              reserved for you.
            </p>
          </div>
        ) : null}

        {!declined && accepted ? (
          <div className="space-y-4 rounded-button bg-success-soft p-4">
            <div>
              <p className="font-black text-text-strong">Agreement accepted</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Review the payment summary below before continuing.
              </p>
            </div>

            <PaymentSummaryCard breakdown={paymentBreakdown} />

            {agreementPdfUrl ? (
              <a
                href={agreementPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
              >
                Download agreement
              </a>
            ) : null}

            {paymentUrl ? (
              <>
                <p className="text-sm font-semibold leading-6 text-text-muted">
                  This payment link expires on{" "}
                  {formatDateTime(paymentExpiresAt)}.
                </p>

                <a
                  href={paymentUrl}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                >
                  Proceed to make payment
                </a>
              </>
            ) : hasTriedPreparingPayment ? (
              <div className="rounded-button bg-danger-soft p-4">
                <p className="text-sm font-black text-text-strong">
                  Payment is not ready
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Please contact the property manager. Do not make payment
                  outside the secure BOPA link.
                </p>
              </div>
            ) : (
              <form action={acceptAction}>
                <input type="hidden" name="token" value={token} />

                <Button type="submit" isLoading={isAccepting} fullWidth>
                  Proceed to make payment
                </Button>
              </form>
            )}
          </div>
        ) : !declined ? (
          <form action={acceptAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            {agreementRequirements.length > 0 ? (
              <div className="rounded-card border border-border-soft bg-surface p-4">
                <p className="text-sm font-black text-text-strong">
                  Approved tenant requirements
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  These answers and clauses were frozen when the manager
                  approved the application.
                </p>

                <div className="mt-3 space-y-3">
                  {agreementRequirements.map((requirement) => (
                    <article
                      key={requirement.id}
                      className="rounded-card bg-white p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-black text-text-strong">
                          {requirement.title}
                        </p>

                        {requirement.approvedAfterReview ? (
                          <span className="w-fit rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning">
                            Manager reviewed
                          </span>
                        ) : (
                          <span className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
                            Confirmed
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                        {requirement.agreementClause}
                      </p>

                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-primary">
                        {requirement.answerLabel}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {guarantors.length > 0 ? (
              <div className="rounded-card border border-border-soft bg-surface p-4">
                <p className="text-sm font-black text-text-strong">
                  Confirmed guarantor record
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Each person below separately confirmed their details and
                  guarantor responsibility.
                </p>

                <div className="mt-3 space-y-3">
                  {guarantors.map((guarantor) => (
                    <article
                      key={guarantor.id}
                      className="rounded-card bg-white p-3"
                    >
                      <p className="text-sm font-black text-text-strong">
                        {guarantor.fullName}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        {guarantor.relationshipToTenant} ·{" "}
                        {guarantor.phoneNumber}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-wide text-success">
                        Confirmed {formatDateTime(guarantor.confirmedAt)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {agreementRules.length > 0 ? (
              <div className="rounded-card border border-border-soft bg-surface p-4">
                <p className="text-sm font-black text-text-strong">
                  Additional property clauses
                </p>
                <div className="mt-3 space-y-3">
                  {agreementRules.map((rule) => (
                    <article
                      key={rule.id}
                      className="rounded-card bg-white p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-black text-text-strong">
                          {rule.title}
                        </p>
                        <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                          {getAppliesToLabel(rule.appliesTo)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                        {rule.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold leading-6 text-text-strong">
              <input
                type="checkbox"
                name="agreementAcknowledgement"
                required
                className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
              />
              <span>
                I have read and agree to the tenancy terms shown above.
              </span>
            </label>

            {agreementRequirements.length > 0 ? (
              <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold leading-6 text-text-strong">
                <input
                  type="checkbox"
                  name="tenantRequirementsAcknowledgement"
                  required
                  className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                />
                <span>
                  I confirm that the approved tenant requirements and recorded
                  answers form part of this tenancy.
                </span>
              </label>
            ) : null}

            {guarantors.length > 0 ? (
              <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold leading-6 text-text-strong">
                <input
                  type="checkbox"
                  name="guarantorAcknowledgement"
                  required
                  className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                />
                <span>
                  I acknowledge that the confirmed guarantor record forms part
                  of this tenancy agreement.
                </span>
              </label>
            ) : null}

            {requiresRuleAcknowledgement ? (
              <label className="flex gap-3 rounded-card border border-border-soft bg-surface p-4 text-sm font-semibold leading-6 text-text-strong">
                <input
                  type="checkbox"
                  name="propertyRulesAcknowledgement"
                  required
                  className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                />
                <span>
                  I have read and accept the additional property clauses listed
                  above.
                </span>
              </label>
            ) : null}

            <Button type="submit" isLoading={isAccepting} fullWidth>
              Accept agreement
            </Button>
          </form>
        ) : null}

        {!accepted && !declined ? (
          <details className="rounded-card border border-border-soft bg-white p-4">
            <summary className="cursor-pointer text-sm font-black text-danger">
              Decline agreement
            </summary>

            <form action={declineAction} className="mt-4 space-y-3">
              <input type="hidden" name="token" value={token} />

              <div className="space-y-2">
                <label
                  htmlFor="decline-reason"
                  className="text-sm font-bold text-text-strong"
                >
                  Reason
                </label>
                <textarea
                  id="decline-reason"
                  name="reason"
                  rows={3}
                  placeholder="Optional"
                  className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                isLoading={isDeclining}
                fullWidth
              >
                Decline agreement
              </Button>
            </form>
          </details>
        ) : null}

        {!accepted && !declined ? (
          <div className="rounded-card bg-warning-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Payment follows acceptance
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              After acceptance, you will see the payment summary before going to
              Paystack.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
