"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  approveManagerTenantOnboardingRequestAction,
  rejectManagerTenantOnboardingRequestAction,
  resendManagerFirstRentPaymentLinkAction,
  resendManagerTenantGuarantorLinkAction,
  resendManagerTenantOnboardingLinkAction,
} from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import { RENT_PAYMENT_FREQUENCY_LABELS } from "@/lib/rent-cycle";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type ManagerTenantOnboardingReviewListProps = {
  requests: ManagerTenantOnboardingRequestRow[];
  initialSelectedRequestId?: string | null;
};

type ReviewKycDocument = {
  label: string;
  path: string | null;
  signedUrl: string | null;
};

type ExistingTenantPaymentEvidence = {
  label: string;
  path: string | null;
  signedUrl: string | null;
};

const ACTIVE_REVIEW_STATUSES = new Set<
  ManagerTenantOnboardingRequestRow["status"]
>([
  "pending",
  "submitted",
  "agreement_sent",
  "agreement_accepted",
  "payment_initialized",
  "payment_expired",
]);

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatNaira(amount: number | null | undefined) {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(Number(amount))
  ) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "Not submitted yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(date));
}

function getStatusLabel(status: ManagerTenantOnboardingRequestRow["status"]) {
  const labels: Record<ManagerTenantOnboardingRequestRow["status"], string> = {
    pending: "Waiting for tenant details",
    submitted: "Submitted for review",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Agreement declined",
    expired: "Expired",
    agreement_sent: "Waiting for tenant acceptance",
    agreement_accepted: "Agreement accepted",
    payment_initialized: "Payment pending",
    payment_paid: "Payment confirmed",
    payment_expired: "Payment pending",
  };

  return labels[status];
}

function getStatusClassName(
  status: ManagerTenantOnboardingRequestRow["status"],
) {
  if (status === "submitted") {
    return "bg-warning-soft text-warning";
  }

  if (
    status === "payment_paid" ||
    status === "approved" ||
    status === "agreement_accepted" ||
    status === "payment_initialized"
  ) {
    return "bg-success-soft text-success";
  }

  if (
    status === "rejected" ||
    status === "expired" ||
    status === "cancelled" ||
    status === "payment_expired"
  ) {
    return "bg-danger-soft text-danger";
  }

  return "bg-primary-soft text-primary";
}

function getTenantTypeLabel(
  type: ManagerTenantOnboardingRequestRow["onboarding_type"],
) {
  return type === "current_occupant"
    ? "Current occupant"
    : "New incoming tenant";
}

function getIdTypeLabel(value: string | null) {
  const labels: Record<string, string> = {
    nin: "NIN",
    passport: "International Passport",
    drivers_license: "Driver's License",
    voters_card: "Voter's Card",
  };

  if (!value) {
    return "Not provided";
  }

  return labels[value] ?? value;
}

function buildToastId(params: {
  requestId: string;
  action: string;
  ok: boolean;
  message: string;
}) {
  return `${params.requestId}-${params.action}-${params.ok ? "success" : "error"}-${params.message}`;
}

function getMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getScreeningLabel(
  result: ManagerTenantOnboardingRequestRow["tenant_screening_result"],
) {
  if (result === "eligible") {
    return "Meets requirements";
  }

  if (result === "review") {
    return "Manager review required";
  }

  if (result === "declined") {
    return "Does not meet requirements";
  }

  return "Not screened";
}

function getScreeningClassName(
  result: ManagerTenantOnboardingRequestRow["tenant_screening_result"],
) {
  if (result === "eligible") {
    return "bg-success-soft text-success";
  }

  if (result === "review") {
    return "bg-warning-soft text-warning";
  }

  if (result === "declined") {
    return "bg-danger-soft text-danger";
  }

  return "bg-surface text-text-muted";
}

function formatRequirementAnswer(
  answer: ManagerTenantOnboardingRequestRow["tenant_requirement_answers"][number],
) {
  if (answer.answerType === "yes_no") {
    return answer.booleanAnswer ? "Yes" : "No";
  }

  if (answer.answerType === "money") {
    return formatNaira(answer.numberAnswer);
  }

  return answer.numberAnswer === null
    ? "Not provided"
    : String(answer.numberAnswer);
}

function ScreeningResultCard({
  request,
}: {
  request: ManagerTenantOnboardingRequestRow;
}) {
  if (
    request.onboarding_type !== "new_incoming_tenant" ||
    request.tenant_screening_result === "not_screened"
  ) {
    return null;
  }

  return (
    <section className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-text-strong">
            Tenant requirement check
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Answers were checked against the requirements saved when this
            tenant link was created.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getScreeningClassName(
            request.tenant_screening_result,
          )}`}
        >
          {getScreeningLabel(request.tenant_screening_result)}
        </span>
      </div>

      {request.tenant_requirement_answers.length > 0 ? (
        <div className="mt-4 divide-y divide-border-soft overflow-hidden rounded-card border border-border-soft">
          {request.tenant_requirement_answers.map((answer) => (
            <article
              key={answer.requirementId}
              className="bg-surface p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-text-strong">
                    {answer.questionText}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Answer:{" "}
                    <span className="font-black text-text-strong">
                      {formatRequirementAnswer(answer)}
                    </span>
                  </p>
                </div>

                <span
                  className={
                    answer.qualifies
                      ? "w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success"
                      : "w-fit rounded-full bg-danger-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-danger"
                  }
                >
                  {answer.qualifies ? "Meets requirement" : "Does not qualify"}
                </span>
              </div>

              {answer.reason ? (
                <p className="mt-2 text-sm font-semibold leading-6 text-danger">
                  {answer.reason}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {request.tenant_screening_result === "declined" ? (
        <p className="mt-4 rounded-card bg-danger-soft p-4 text-sm font-semibold leading-6 text-danger">
          This application was closed and the unit was released because at
          least one answer was marked as a decline condition.
        </p>
      ) : null}
    </section>
  );
}

function getRequiredGuarantorCount(
  request: ManagerTenantOnboardingRequestRow,
) {
  const requirement = request.tenant_requirements_snapshot.find(
    (item) =>
      item.requirementCode === "guarantor_required" &&
      item.expectedBoolean === true,
  );

  if (!requirement) {
    return 0;
  }

  return requirement.requiredGuarantorCount === 2 ? 2 : 1;
}

function getGuarantorStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmed";
  if (status === "declined") return "Declined";
  if (status === "cancelled") return "Cancelled";
  return "Waiting for confirmation";
}

function getGuarantorStatusClassName(status: string) {
  if (status === "confirmed") return "bg-success-soft text-success";
  if (status === "declined" || status === "cancelled") {
    return "bg-danger-soft text-danger";
  }
  return "bg-warning-soft text-warning";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-card bg-surface p-3">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 wrap-break-word text-sm font-black text-text-strong">
        {value?.trim() || "Not provided"}
      </p>
    </div>
  );
}

function WhatsAppActionCard({
  title,
  description,
  phoneNumber,
  message,
  copyText,
  whatsappLabel = "Open WhatsApp",
  copyLabel = "Copy message",
}: {
  title: string;
  description: string;
  phoneNumber?: string | null;
  message?: string;
  copyText?: string;
  whatsappLabel?: string;
  copyLabel?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-card border border-border-soft bg-success-soft p-4">
      <p className="text-sm font-black text-text-strong">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
        {description}
      </p>

      <WhatsAppShareActions
        phoneNumber={phoneNumber}
        message={message}
        copyText={copyText ?? message}
        whatsappLabel={whatsappLabel}
        copyLabel={copyLabel}
        className="mt-4"
      />
    </div>
  );
}

export function ManagerTenantOnboardingReviewDetail({
  request,
  kycDocuments = [],
  existingTenantPaymentEvidence = null,
}: {
  request: ManagerTenantOnboardingRequestRow;
  kycDocuments?: ReviewKycDocument[];
  existingTenantPaymentEvidence?: ExistingTenantPaymentEvidence | null;
}) {
  const [showReject, setShowReject] = useState(false);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);

  const [approveState, approveAction, isApproving] = useActionState(
    approveManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const [tenantLinkState, tenantLinkAction, isResendingTenantLink] =
    useActionState(
      resendManagerTenantOnboardingLinkAction,
      initialManagerTenantOnboardingActionState,
    );

  const [resendState, resendAction, isResendingPayment] = useActionState(
    resendManagerFirstRentPaymentLinkAction,
    initialManagerTenantOnboardingActionState,
  );

  const [
    guarantorLinkState,
    guarantorLinkAction,
    isPreparingGuarantorLink,
  ] = useActionState(
    resendManagerTenantGuarantorLinkAction,
    initialManagerTenantOnboardingActionState,
  );

  const toasts = useMemo<ToastItem[]>(() => {
    const nextToasts: ToastItem[] = [];

    if (approveState.message) {
      const id = buildToastId({
        requestId: request.id,
        action: "approve",
        ok: approveState.ok,
        message: approveState.message,
      });

      if (!dismissedToastIds.includes(id)) {
        nextToasts.push({
          id,
          tone: approveState.ok ? "success" : "error",
          title: approveState.ok ? "Approved" : "Could not approve",
          description: approveState.message,
        });
      }
    }

    if (rejectState.message) {
      const id = buildToastId({
        requestId: request.id,
        action: "reject",
        ok: rejectState.ok,
        message: rejectState.message,
      });

      if (!dismissedToastIds.includes(id)) {
        nextToasts.push({
          id,
          tone: rejectState.ok ? "success" : "error",
          title: rejectState.ok ? "Rejected" : "Could not reject",
          description: rejectState.message,
        });
      }
    }

    if (resendState.message) {
      const id = buildToastId({
        requestId: request.id,
        action: "payment",
        ok: resendState.ok,
        message: resendState.message,
      });

      if (!dismissedToastIds.includes(id)) {
        nextToasts.push({
          id,
          tone: resendState.ok ? "success" : "error",
          title: resendState.ok
            ? "Payment link ready"
            : "Could not prepare payment link",
          description: resendState.message,
        });
      }
    }

    if (tenantLinkState.message) {
      const id = buildToastId({
        requestId: request.id,
        action: "tenant-link",
        ok: tenantLinkState.ok,
        message: tenantLinkState.message,
      });

      if (!dismissedToastIds.includes(id)) {
        nextToasts.push({
          id,
          tone: tenantLinkState.ok ? "success" : "error",
          title: tenantLinkState.ok
            ? "Tenant link ready"
            : "Could not prepare tenant link",
          description: tenantLinkState.message,
        });
      }
    }

    if (guarantorLinkState.message) {
      const id = buildToastId({
        requestId: request.id,
        action: "guarantor-link",
        ok: guarantorLinkState.ok,
        message: guarantorLinkState.message,
      });

      if (!dismissedToastIds.includes(id)) {
        nextToasts.push({
          id,
          tone: guarantorLinkState.ok ? "success" : "error",
          title: guarantorLinkState.ok
            ? "Guarantor link ready"
            : "Could not prepare guarantor link",
          description: guarantorLinkState.message,
        });
      }
    }

    return nextToasts;
  }, [
    approveState.message,
    approveState.ok,
    dismissedToastIds,
    guarantorLinkState.message,
    guarantorLinkState.ok,
    rejectState.message,
    rejectState.ok,
    request.id,
    resendState.message,
    resendState.ok,
    tenantLinkState.message,
    tenantLinkState.ok,
  ]);

  function dismissToast(id: string) {
    setDismissedToastIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }

  const canReview = request.status === "submitted";
  const requiredGuarantorCount = getRequiredGuarantorCount(request);
  const guarantors = (request.manager_tenant_guarantors ?? [])
    .filter((guarantor) => guarantor.status !== "cancelled")
    .sort((first, second) => first.position - second.position);
  const confirmedGuarantorCount = guarantors.filter(
    (guarantor) => guarantor.status === "confirmed",
  ).length;
  const guarantorsReady =
    requiredGuarantorCount === 0 ||
    (guarantors.length === requiredGuarantorCount &&
      confirmedGuarantorCount === requiredGuarantorCount);
  const canResendTenantLink = request.status === "pending";
  const canResendPayment =
    request.onboarding_type === "new_incoming_tenant" &&
    (request.status === "agreement_accepted" ||
      request.status === "payment_initialized" ||
      request.status === "payment_expired");
  const approvedAgreementMessage =
    approveState.ok && approveState.whatsappMessage
      ? approveState.whatsappMessage
      : null;
  const storedAgreementMessage = getMetadataText(
    request.metadata,
    "agreement_share_message",
  );
  const agreementSentMessage =
    request.status === "agreement_sent" && !approvedAgreementMessage
      ? storedAgreementMessage
      : null;

  const tenantName =
    request.tenant_full_name ?? request.invited_tenant_full_name ?? "Tenant";
  const tenantPhone =
    request.tenant_phone_number ?? request.invited_tenant_phone_number ?? "";
  const propertyName = request.manager_properties?.property_name ?? "Property";
  const unitLabel = request.manager_units?.unit_label ?? "Unit";
  const unitRentAmount =
    request.manager_units?.rent_amount ??
    request.manager_confirmed_rent_amount ??
    0;
  const today = getTodayDateValue();
  const defaultMoveInDate =
    request.onboarding_type === "new_incoming_tenant"
      ? today
      : (request.tenant_move_in_date ?? "");
  const minMoveInDate =
    request.onboarding_type === "new_incoming_tenant" ? today : undefined;
  const toastStack =
    toasts.length > 0 ? (
      <div className="fixed left-1/2 top-4 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    ) : null;
  const tenantLinkReadyCard =
    tenantLinkState.ok && tenantLinkState.requestId === request.id ? (
      <WhatsAppActionCard
        title="Tenant link ready"
        description="Send the link to the tenant to complete their details."
        phoneNumber={tenantLinkState.tenantWhatsappNumber}
        message={tenantLinkState.whatsappMessage}
        whatsappLabel="Open WhatsApp"
        copyLabel="Copy message"
      />
    ) : null;

  if (request.status === "pending") {
    return (
      <>
        {toastStack}

        <section className="rounded-card border border-border-soft bg-white shadow-sm">
          <div className="border-b border-border-soft p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-black text-text-strong">
                  {tenantName}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {unitLabel} - {propertyName} -{" "}
                  {getTenantTypeLabel(request.onboarding_type)}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                  request.status,
                )}`}
              >
                {getStatusLabel(request.status)}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {tenantLinkReadyCard}

            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-card bg-primary-soft p-4">
                <p className="text-sm font-black text-text-strong">
                  Waiting for tenant details
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  The tenant has not submitted their information yet.
                </p>
              </div>

              <form action={tenantLinkAction}>
                <input type="hidden" name="requestId" value={request.id} />

                <Button
                  type="submit"
                  isLoading={isResendingTenantLink}
                  fullWidth
                >
                  Send again
                </Button>
              </form>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {toastStack}

      <section className="rounded-card border border-border-soft bg-white shadow-sm">
        <div className="border-b border-border-soft p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-lg font-black text-text-strong">
                {tenantName}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                {unitLabel} · {propertyName} ·{" "}
                {getTenantTypeLabel(request.onboarding_type)}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                request.status,
              )}`}
            >
              {getStatusLabel(request.status)}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {approvedAgreementMessage ? (
            <WhatsAppActionCard
              title="Agreement ready to send"
              description="Send the tenancy agreement to the tenant for review and acceptance."
              phoneNumber={approveState.tenantWhatsappNumber}
              message={approvedAgreementMessage}
            />
          ) : null}

          {agreementSentMessage ? (
            <WhatsAppActionCard
              title="Agreement sent"
              description="Waiting for the tenant to review and accept the agreement."
              phoneNumber={tenantPhone}
              message={agreementSentMessage}
              whatsappLabel="Send again"
            />
          ) : null}

          {tenantLinkReadyCard}

          {resendState.ok && resendState.requestId === request.id ? (
            <WhatsAppActionCard
              title="Payment link ready"
              description="Open WhatsApp to send the payment link to the tenant."
              phoneNumber={resendState.tenantWhatsappNumber}
              message={resendState.whatsappMessage}
            />
          ) : null}

          <ScreeningResultCard request={request} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Full name" value={request.tenant_full_name} />
            <DetailItem label="Phone" value={request.tenant_phone_number} />
            <DetailItem label="Email" value={request.tenant_email} />
            <DetailItem label="Occupation" value={request.tenant_occupation} />
            <DetailItem
              label="Means of ID"
              value={getIdTypeLabel(request.tenant_id_type)}
            />
            <DetailItem label="ID number" value={request.tenant_id_number} />
            <DetailItem label="Unit rent" value={formatNaira(unitRentAmount)} />
            <DetailItem
              label="Rent collection"
              value={
                RENT_PAYMENT_FREQUENCY_LABELS[
                  request.manager_units?.rent_frequency ?? "annual"
                ]
              }
            />
            <DetailItem
              label="Move-in date"
              value={formatDate(request.tenant_move_in_date)}
            />
            <DetailItem
              label="Submitted"
              value={formatDateTime(request.submitted_at)}
            />
          </div>

          {request.tenant_notes ? (
            <div className="rounded-card bg-surface p-3">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Tenant note
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                {request.tenant_notes}
              </p>
            </div>
          ) : null}

          {request.onboarding_type === "current_occupant" &&
          request.existing_tenant_last_payment_amount ? (
            <div className="rounded-card border border-border-soft bg-white p-4">
              <p className="text-sm font-black text-text-strong">
                Last payment evidence
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <DetailItem
                  label="Amount last paid"
                  value={formatNaira(
                    request.existing_tenant_last_payment_amount,
                  )}
                />
                <DetailItem
                  label="Payment date"
                  value={formatDate(
                    request.existing_tenant_last_payment_date,
                  )}
                />
                <DetailItem
                  label="Receipt file"
                  value={
                    request.existing_tenant_last_payment_receipt_file_name ??
                    "Uploaded receipt"
                  }
                />
              </div>

              {existingTenantPaymentEvidence?.signedUrl ? (
                <Link
                  href={existingTenantPaymentEvidence.signedUrl}
                  target="_blank"
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  View receipt
                </Link>
              ) : null}
            </div>
          ) : null}

          {requiredGuarantorCount > 0 ? (
            <div className="rounded-card border border-border-soft bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-text-strong">
                    Guarantors
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    {confirmedGuarantorCount} of {requiredGuarantorCount} confirmed.
                  </p>
                </div>
                <span
                  className={
                    guarantorsReady
                      ? "w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success"
                      : "w-fit rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning"
                  }
                >
                  {guarantorsReady ? "Ready" : "Confirmation pending"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {guarantors.map((guarantor) => {
                  const preparedLink =
                    guarantorLinkState.guarantorId === guarantor.id
                      ? guarantorLinkState.guarantorLinks?.[0]
                      : null;

                  return (
                    <article
                      key={guarantor.id}
                      className="rounded-card bg-surface p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-text-strong">
                            {guarantor.full_name}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-text-muted">
                            {guarantor.relationship_to_tenant} · {guarantor.phone_number}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getGuarantorStatusClassName(
                            guarantor.status,
                          )}`}
                        >
                          {getGuarantorStatusLabel(guarantor.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <DetailItem label="Email" value={guarantor.email} />
                        <DetailItem label="Occupation" value={guarantor.occupation} />
                        <DetailItem
                          label="Employer / business"
                          value={guarantor.employer_or_business}
                        />
                        <DetailItem
                          label="Residential address"
                          value={guarantor.residential_address}
                        />
                        <DetailItem
                          label="Means of ID"
                          value={getIdTypeLabel(guarantor.id_type)}
                        />
                        <DetailItem
                          label="ID number"
                          value={guarantor.id_number}
                        />
                      </div>

                      {preparedLink?.whatsappMessage ? (
                        <WhatsAppActionCard
                          title="Guarantor link ready"
                          description="Send this private confirmation link to the guarantor."
                          phoneNumber={preparedLink.phoneNumber}
                          message={preparedLink.whatsappMessage}
                        />
                      ) : guarantor.status === "pending_confirmation" ? (
                        <form action={guarantorLinkAction} className="mt-3">
                          <input
                            type="hidden"
                            name="guarantorId"
                            value={guarantor.id}
                          />
                          <Button
                            type="submit"
                            variant="secondary"
                            isLoading={
                              isPreparingGuarantorLink &&
                              guarantorLinkState.guarantorId === guarantor.id
                            }
                          >
                            Prepare confirmation link
                          </Button>
                        </form>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {kycDocuments.some((document) => document.signedUrl) ? (
            <div className="rounded-card border border-border-soft bg-white p-4">
              <p className="text-sm font-black text-text-strong">
                Uploaded KYC documents
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {kycDocuments
                  .filter((document) => document.signedUrl)
                  .map((document) => (
                    <Link
                      key={document.label}
                      href={document.signedUrl ?? "#"}
                      target="_blank"
                      className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                    >
                      {document.label}
                    </Link>
                  ))}
              </div>
            </div>
          ) : null}

          {canResendTenantLink ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-card bg-primary-soft p-4">
                <p className="text-sm font-black text-text-strong">
                  Waiting for tenant details
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  The tenant has not submitted their information yet.
                </p>
              </div>

              <form action={tenantLinkAction}>
                <input type="hidden" name="requestId" value={request.id} />

                <Button
                  type="submit"
                  isLoading={isResendingTenantLink}
                  fullWidth
                >
                  Send again
                </Button>
              </form>
            </div>
          ) : null}

          {request.status === "agreement_sent" && !agreementSentMessage ? (
            <div className="rounded-card bg-primary-soft p-4">
              <p className="text-sm font-black text-text-strong">
                Agreement sent
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Waiting for the tenant to review and accept the agreement.
              </p>
            </div>
          ) : null}

          {canReview && !guarantorsReady ? (
            <div className="rounded-card bg-warning-soft p-4">
              <p className="text-sm font-black text-text-strong">
                Guarantor confirmation is still pending
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                The tenant cannot be approved until every required guarantor confirms their details and responsibility.
              </p>
            </div>
          ) : null}

          {canReview ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <form action={approveAction} className="space-y-4">
                <input type="hidden" name="requestId" value={request.id} />

                <div>
                  <label
                    htmlFor={`move-in-${request.id}`}
                    className="text-sm font-bold text-text-strong"
                  >
                    Move-in date
                  </label>

                  <input
                    id={`move-in-${request.id}`}
                    name="confirmedMoveInDate"
                    type="date"
                    defaultValue={defaultMoveInDate}
                    min={minMoveInDate}
                    className="mt-2 min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none transition focus:border-primary"
                    required
                  />

                  {approveState.fieldErrors?.confirmedMoveInDate?.[0] ? (
                    <p className="mt-2 text-sm font-semibold text-danger">
                      {approveState.fieldErrors.confirmedMoveInDate[0]}
                    </p>
                  ) : null}
                </div>

                <CurrencyInput
                  label="Opening balance"
                  name="openingBalance"
                  defaultValue="0"
                  placeholder="0.00"
                  error={approveState.fieldErrors?.openingBalance?.[0]}
                  required
                />

                <details className="rounded-card border border-border-soft bg-white p-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">
                    Add review note
                  </summary>

                  <div className="mt-3 space-y-2">
                    <label
                      htmlFor={`review-${request.id}`}
                      className="text-sm font-bold text-text-strong"
                    >
                      Review note
                    </label>
                    <textarea
                      id={`review-${request.id}`}
                      name="reviewNotes"
                      rows={3}
                      placeholder="Optional"
                      className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                    />
                  </div>
                </details>

                <Button
                  type="submit"
                  isLoading={isApproving}
                  disabled={!guarantorsReady}
                  fullWidth
                >
                  {request.onboarding_type === "new_incoming_tenant"
                    ? "Approve and Create Agreement Link"
                    : "Approve Current Occupant"}
                </Button>
              </form>

              <aside className="space-y-4">
                <div className="rounded-card bg-surface p-4">
                  <p className="text-sm font-black text-text-strong">
                    After approval
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                    {request.onboarding_type === "new_incoming_tenant"
                      ? "The agreement link will be created immediately. Send it to the tenant on WhatsApp."
                      : "The tenant record becomes active and this unit becomes occupied."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReject((current) => !current)}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  {showReject ? "Hide rejection" : "Reject details"}
                </button>

                {showReject ? (
                  <form action={rejectAction} className="space-y-3">
                    <input type="hidden" name="requestId" value={request.id} />

                    <div className="space-y-2">
                      <label
                        htmlFor={`reject-${request.id}`}
                        className="text-sm font-bold text-text-strong"
                      >
                        Rejection reason
                      </label>
                      <textarea
                        id={`reject-${request.id}`}
                        name="reason"
                        rows={4}
                        placeholder="Explain why this was rejected"
                        className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                      />
                      {rejectState.fieldErrors?.reason?.[0] ? (
                        <p className="text-sm font-semibold text-danger">
                          {rejectState.fieldErrors.reason[0]}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      isLoading={isRejecting}
                      fullWidth
                    >
                      Reject
                    </Button>
                  </form>
                ) : null}
              </aside>
            </div>
          ) : null}

          {canResendPayment ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-card bg-surface p-4">
                <p className="text-sm font-black text-text-strong">
                  {request.status === "agreement_accepted"
                    ? "Agreement accepted"
                    : "Payment pending"}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  The tenant has been shown the payment step. Resend only if
                  the tenant cannot access it.
                </p>
              </div>

              <form action={resendAction}>
                <input type="hidden" name="requestId" value={request.id} />

                <Button type="submit" isLoading={isResendingPayment} fullWidth>
                  Resend Payment Link
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export function ManagerTenantOnboardingReviewList({
  requests,
  initialSelectedRequestId = null,
}: ManagerTenantOnboardingReviewListProps) {
  const activeRequests = requests.filter(
    (request) =>
      ACTIVE_REVIEW_STATUSES.has(request.status) ||
      (request.status === "rejected" &&
        request.tenant_screening_result === "declined"),
  );

  const initialSelectedActiveRequestId =
    initialSelectedRequestId &&
    activeRequests.some((request) => request.id === initialSelectedRequestId)
      ? initialSelectedRequestId
      : null;

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    initialSelectedActiveRequestId,
  );
  const detailRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToDetailRef = useRef(false);
  useEffect(() => {
    if (!selectedRequestId || !shouldScrollToDetailRef.current) {
      return;
    }

    shouldScrollToDetailRef.current = false;
    detailRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedRequestId]);

  const submittedCount = activeRequests.filter(
    (request) => request.status === "submitted",
  ).length;

  const selectedRequest =
    activeRequests.find((request) => request.id === selectedRequestId) ?? null;

  function handleViewRequest(requestId: string) {
    if (requestId === selectedRequestId) {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    shouldScrollToDetailRef.current = true;
    setSelectedRequestId(requestId);
  }

  if (activeRequests.length === 0) {
    return null;
  }

  return (
    <section id="tenant-review" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Tenant review
          </h2>
          <p className="text-sm font-semibold leading-6 text-text-muted">
            View submitted tenant details before approval.
          </p>
        </div>

        {submittedCount > 0 ? (
          <span className="w-fit rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning">
            {submittedCount} waiting
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border-soft text-left">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                  Tenant
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                  Property / unit
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-text-muted">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-soft bg-white">
              {activeRequests.map((request) => {
                const tenantName =
                  request.tenant_full_name ??
                  request.invited_tenant_full_name ??
                  "Tenant";
                const isSelected = request.id === selectedRequestId;

                return (
                  <tr
                    key={request.id}
                    className={isSelected ? "bg-primary-soft" : undefined}
                  >
                    <td className="px-4 py-4">
                      <p className="text-sm font-black text-text-strong">
                        {tenantName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {request.tenant_phone_number ??
                          request.invited_tenant_phone_number ??
                          "No phone"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-text-strong">
                        {request.manager_properties?.property_name ??
                          "Property"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {request.manager_units?.unit_label ?? "Unit"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm font-bold text-text-strong">
                      {getTenantTypeLabel(request.onboarding_type)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                          request.status,
                        )}`}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewRequest(request.id)}
                        className={
                          isSelected
                            ? "inline-flex min-h-10 items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary transition hover:bg-primary-soft"
                            : "inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                        }
                      >
                        {isSelected ? "Viewing" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border-soft md:hidden">
          {activeRequests.map((request) => {
            const tenantName =
              request.tenant_full_name ??
              request.invited_tenant_full_name ??
              "Tenant";
            const isSelected = request.id === selectedRequestId;

            return (
              <article
                key={request.id}
                className={isSelected ? "bg-primary-soft p-4" : "p-4"}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-text-strong">{tenantName}</p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {request.manager_units?.unit_label ?? "Unit"} ·{" "}
                      {getTenantTypeLabel(request.onboarding_type)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusClassName(
                      request.status,
                    )}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewRequest(request.id)}
                  className={
                    isSelected
                      ? "mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary transition hover:bg-primary-soft"
                      : "mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  }
                >
                  {isSelected ? "Viewing" : "View"}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {selectedRequest ? (
        <div id="tenant-review-detail" ref={detailRef} className="scroll-mt-24">
          <ManagerTenantOnboardingReviewDetail
            key={selectedRequest.id}
            request={selectedRequest}
          />
        </div>
      ) : null}
    </section>
  );
}
