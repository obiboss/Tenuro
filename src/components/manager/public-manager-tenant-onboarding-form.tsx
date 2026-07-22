"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { submitManagerTenantOnboardingRequestAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import {
  getCurrentLagosDateOnly,
  RENT_PAYMENT_FREQUENCY_LABELS,
} from "@/lib/rent-cycle";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type PublicManagerTenantOnboardingFormProps = {
  token: string;
  request: ManagerTenantOnboardingRequestRow;
};

type UploadResponse = {
  ok: boolean;
  message: string;
  file?: {
    bucket: string;
    path: string;
    contentType: string;
    sizeBytes: number;
    fileName?: string;
  };
};

const idTypeOptions = [
  ["nin", "NIN"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's License"],
  ["voters_card", "Voter's Card"],
] as const;



type RequirementAnswerDraft = {
  booleanAnswer?: boolean;
  numberAnswer?: string;
};

type GuarantorDraft = {
  fullName: string;
  phoneNumber: string;
  email: string;
  relationshipToTenant: string;
  residentialAddress: string;
  occupation: string;
  employerOrBusiness: string;
  monthlyIncome: string;
  idType: "nin" | "passport" | "drivers_license" | "voters_card";
  idNumber: string;
};

function createEmptyGuarantor(): GuarantorDraft {
  return {
    fullName: "",
    phoneNumber: "",
    email: "",
    relationshipToTenant: "",
    residentialAddress: "",
    occupation: "",
    employerOrBusiness: "",
    monthlyIncome: "",
    idType: "nin",
    idNumber: "",
  };
}

function getSuccessCopy(
  screeningResult:
    | "not_screened"
    | "eligible"
    | "review"
    | "declined"
    | undefined,
) {
  if (screeningResult === "declined") {
    return {
      badge: "Application closed",
      title: "Property requirements not met",
      description:
        "Your answers do not meet one or more requirements set for this property.",
      next: "The unit has been released. Contact the property manager only if you believe an answer was entered incorrectly.",
    };
  }

  if (screeningResult === "review") {
    return {
      badge: "Review required",
      title: "Application sent for review",
      description: "One or more answers require the property manager's review.",
      next: "The property manager will review your information before deciding the next step.",
    };
  }

  return {
    badge: "Submitted",
    title: "Details submitted",
    description: "Your information is being reviewed.",
    next: "Once approved, you will receive the tenancy agreement through WhatsApp or email.",
  };
}

function buildToastId(params: { ok: boolean; message: string }) {
  return `${params.ok ? "success" : "error"}-${params.message}`;
}

export function PublicManagerTenantOnboardingForm({
  token,
  request,
}: PublicManagerTenantOnboardingFormProps) {
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptMimeType, setReceiptMimeType] = useState("");
  const [receiptSizeBytes, setReceiptSizeBytes] = useState("");
  const [receiptUploadMessage, setReceiptUploadMessage] = useState("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const [state, formAction, isPending] = useActionState(
    submitManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const isCurrentOccupant = request.onboarding_type === "current_occupant";
  const tenantRequirements = useMemo(
    () => (isCurrentOccupant ? [] : request.tenant_requirements_snapshot),
    [isCurrentOccupant, request.tenant_requirements_snapshot],
  );
  const guarantorRequirement = tenantRequirements.find(
    (requirement) =>
      requirement.requirementCode === "guarantor_required" &&
      requirement.expectedBoolean === true,
  );
  const requiredGuarantorCount = guarantorRequirement
    ? guarantorRequirement.requiredGuarantorCount === 2
      ? 2
      : 1
    : 0;
  const visibleTenantRequirements = tenantRequirements.filter(
    (requirement) => requirement.requirementCode !== "guarantor_required",
  );

  const [guarantors, setGuarantors] = useState<GuarantorDraft[]>(
    Array.from({ length: requiredGuarantorCount }, createEmptyGuarantor),
  );
  const [requirementAnswers, setRequirementAnswers] = useState<
    Record<string, RequirementAnswerDraft>
  >({});

  const requirementAnswersJson = useMemo(
    () =>
      JSON.stringify(
        tenantRequirements.map((requirement) => {
          const answer = requirementAnswers[requirement.id] ?? {};

          return {
            requirementId: requirement.id,
            booleanAnswer:
              requirement.requirementCode === "guarantor_required"
                ? true
                : requirement.answerType === "yes_no"
                  ? answer.booleanAnswer
                  : undefined,
            numberAnswer:
              requirement.answerType === "yes_no"
                ? undefined
                : answer.numberAnswer,
          };
        }),
      ),
    [requirementAnswers, tenantRequirements],
  );
  const guarantorsJson = useMemo(
    () => JSON.stringify(guarantors),
    [guarantors],
  );

  const successCopy = getSuccessCopy(state.screeningResult);

  async function handleReceiptUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingReceipt(true);
    setReceiptUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("managerOnboardingToken", token);
      formData.append("documentType", "existing_tenant_last_payment_receipt");
      formData.append("file", file);

      const response = await fetch("/api/files/signed-upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.ok || !result.file) {
        throw new Error(result.message || "Receipt upload failed.");
      }

      setReceiptPath(result.file.path);
      setReceiptFileName(result.file.fileName ?? file.name);
      setReceiptMimeType(result.file.contentType);
      setReceiptSizeBytes(String(result.file.sizeBytes));
      setReceiptUploadMessage("Receipt uploaded successfully.");
    } catch (error) {
      setReceiptPath("");
      setReceiptFileName("");
      setReceiptMimeType("");
      setReceiptSizeBytes("");
      setReceiptUploadMessage(
        error instanceof Error ? error.message : "Receipt upload failed.",
      );

      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
    } finally {
      setIsUploadingReceipt(false);
    }
  }

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = buildToastId({
      ok: state.ok,
      message: state.message,
    });

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok ? successCopy.title : "Could not submit details",
      description: state.ok ? successCopy.description : state.message,
    };
  }, [
    dismissedToastId,
    state.message,
    state.ok,
    successCopy.description,
    successCopy.title,
  ]);

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast toast={toast} onDismiss={setDismissedToastId} />
        </div>
      ) : null}

      {state.ok ? (
        <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
          <div
            className={
              state.screeningResult === "declined"
                ? "w-fit rounded-full bg-danger-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-danger"
                : state.screeningResult === "review"
                  ? "w-fit rounded-full bg-warning-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-warning"
                  : "w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success"
            }
          >
            {successCopy.badge}
          </div>

          <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
            {successCopy.title}
          </h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            {successCopy.description}
          </p>

          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
            {successCopy.next}
          </p>

          {state.guarantorLinks?.length ? (
            <div className="mt-5 space-y-3 border-t border-border-soft pt-5">
              <div>
                <p className="font-black text-text-strong">
                  Send confirmation to your guarantor
                  {state.guarantorLinks.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Each guarantor must confirm before the property manager can
                  approve the application.
                </p>
              </div>

              {state.guarantorLinks.map((link) => (
                <div
                  key={link.guarantorId}
                  className="rounded-card border border-border-soft bg-surface p-4"
                >
                  <p className="text-sm font-black text-text-strong">
                    {link.fullName}
                  </p>
                  <WhatsAppShareActions
                    phoneNumber={link.phoneNumber}
                    message={link.whatsappMessage}
                    copyText={link.whatsappMessage}
                    whatsappLabel="Open WhatsApp"
                    copyLabel="Copy message"
                    className="mt-3"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <form
          action={formAction}
          className="rounded-card border border-border-soft bg-white shadow-sm"
        >
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="requirementAnswersJson"
            value={requirementAnswersJson}
          />
          <input type="hidden" name="guarantorsJson" value={guarantorsJson} />

          <div className="border-b border-border-soft p-5">
            <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
              Tenant details
            </p>

            <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
              Confirm your details
            </h1>

            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {request.manager_units?.unit_label ?? "Unit"} ·{" "}
              {request.manager_properties?.property_name ?? "Property"}
            </p>
          </div>

          <div className="space-y-5 p-5">
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-black tracking-tight text-text-strong">
                  Personal details
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  These details will appear on your tenant record.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="fullName"
                  defaultValue={request.invited_tenant_full_name ?? ""}
                  error={state.fieldErrors?.fullName?.[0]}
                  required
                />

                <Input
                  label="Phone number"
                  name="phoneNumber"
                  defaultValue={request.invited_tenant_phone_number ?? ""}
                  error={state.fieldErrors?.phoneNumber?.[0]}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={request.invited_tenant_email ?? ""}
                  placeholder="Optional"
                  error={state.fieldErrors?.email?.[0]}
                />

                <Input
                  label="Occupation"
                  name="occupation"
                  placeholder="Optional"
                  error={state.fieldErrors?.occupation?.[0]}
                />
              </div>
            </section>

            <section className="border-t border-border-soft pt-5">
              <div>
                <h2 className="text-base font-black tracking-tight text-text-strong">
                  Identification
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Provide one valid identification record.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-bold text-text-strong"
                    htmlFor="idType"
                  >
                    Means of ID
                  </label>

                  <select
                    id="idType"
                    name="idType"
                    className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                    required
                  >
                    {idTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {state.fieldErrors?.idType?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.idType[0]}
                    </p>
                  ) : null}
                </div>

                <Input
                  label="ID number"
                  name="idNumber"
                  error={state.fieldErrors?.idNumber?.[0]}
                  required
                />
              </div>
            </section>

            {!isCurrentOccupant && visibleTenantRequirements.length > 0 ? (
              <section className="border-t border-border-soft pt-5">
                <div>
                  <h2 className="text-base font-black tracking-tight text-text-strong">
                    Property requirements
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Answer every question honestly. Your answers are checked
                    against the requirements saved for this property.
                  </p>
                </div>

                <div className="mt-4 space-y-4">
                  {visibleTenantRequirements.map((requirement) => {
                    const answer = requirementAnswers[requirement.id] ?? {};

                    return (
                      <article
                        key={requirement.id}
                        className="rounded-card border border-border-soft bg-surface p-4"
                      >
                        <p className="text-sm font-black text-text-strong">
                          {requirement.questionText}
                        </p>

                        {requirement.description ? (
                          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                            {requirement.description}
                          </p>
                        ) : null}

                        <div className="mt-3">
                          {requirement.answerType === "yes_no" ? (
                            <div className="space-y-2">
                              <label
                                htmlFor={`requirement-${requirement.id}`}
                                className="text-sm font-bold text-text-strong"
                              >
                                Your answer
                              </label>

                              <select
                                id={`requirement-${requirement.id}`}
                                value={
                                  answer.booleanAnswer === undefined
                                    ? ""
                                    : String(answer.booleanAnswer)
                                }
                                onChange={(event) =>
                                  setRequirementAnswers((current) => ({
                                    ...current,
                                    [requirement.id]: {
                                      booleanAnswer:
                                        event.target.value === "true",
                                    },
                                  }))
                                }
                                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                                required
                              >
                                <option value="">Select answer</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </div>
                          ) : requirement.answerType === "money" ? (
                            <CurrencyInput
                              label="Average monthly income"
                              name={`requirement-${requirement.id}`}
                              value={answer.numberAnswer ?? ""}
                              onValueChange={(value) =>
                                setRequirementAnswers((current) => ({
                                  ...current,
                                  [requirement.id]: {
                                    numberAnswer: value,
                                  },
                                }))
                              }
                              placeholder="0.00"
                              required
                            />
                          ) : (
                            <Input
                              label="Number of occupants"
                              type="number"
                              min="1"
                              step="1"
                              value={answer.numberAnswer ?? ""}
                              onChange={(event) =>
                                setRequirementAnswers((current) => ({
                                  ...current,
                                  [requirement.id]: {
                                    numberAnswer: event.target.value,
                                  },
                                }))
                              }
                              required
                            />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!isCurrentOccupant && requiredGuarantorCount > 0 ? (
              <section className="border-t border-border-soft pt-5">
                <div>
                  <h2 className="text-base font-black tracking-tight text-text-strong">
                    Guarantor details
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Enter complete details for {requiredGuarantorCount}{" "}
                    guarantor{requiredGuarantorCount === 1 ? "" : "s"}. They
                    will receive a private link to verify the details and accept
                    the responsibility.
                  </p>
                </div>

                <div className="mt-4 space-y-5">
                  {guarantors.map((guarantor, index) => (
                    <article
                      key={`guarantor-${index + 1}`}
                      className="space-y-4 rounded-card border border-border-soft bg-surface p-4"
                    >
                      <p className="font-black text-text-strong">
                        Guarantor {index + 1}
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Full name"
                          value={guarantor.fullName}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, fullName: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                        <Input
                          label="Phone number"
                          value={guarantor.phoneNumber}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, phoneNumber: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Email"
                          type="email"
                          value={guarantor.email}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, email: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Optional"
                        />
                        <Input
                          label="Relationship to you"
                          value={guarantor.relationshipToTenant}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      relationshipToTenant: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Example: Employer, sibling, family friend"
                          required
                        />
                      </div>

                      <Input
                        label="Residential address"
                        value={guarantor.residentialAddress}
                        onChange={(event) =>
                          setGuarantors((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    residentialAddress: event.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                        required
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Occupation"
                          value={guarantor.occupation}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, occupation: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                        <Input
                          label="Employer or business"
                          value={guarantor.employerOrBusiness}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      employerOrBusiness: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Optional"
                        />
                      </div>

                      <CurrencyInput
                        label="Average monthly income"
                        name={`guarantor-income-${index}`}
                        value={guarantor.monthlyIncome}
                        onValueChange={(value) =>
                          setGuarantors((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, monthlyIncome: value }
                                : item,
                            ),
                          )
                        }
                        placeholder="0.00"
                        required
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor={`guarantor-id-type-${index}`}
                            className="text-sm font-bold text-text-strong"
                          >
                            Means of ID
                          </label>
                          <select
                            id={`guarantor-id-type-${index}`}
                            value={guarantor.idType}
                            onChange={(event) =>
                              setGuarantors((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        idType: event.target
                                          .value as GuarantorDraft["idType"],
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                            required
                          >
                            {idTypeOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Input
                          label="ID number"
                          value={guarantor.idNumber}
                          onChange={(event) =>
                            setGuarantors((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, idNumber: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {isCurrentOccupant ? (
              <section className="border-t border-border-soft pt-5">
                <div>
                  <h2 className="text-base font-black tracking-tight text-text-strong">
                    Rent details
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Confirm the original move-in date and the last payment. The unit rent amount and frequency are already fixed.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Move-in date"
                    name="moveInDate"
                    type="date"
                    helperText="This date becomes the permanent rent-cycle anchor."
                    error={state.fieldErrors?.moveInDate?.[0]}
                    required
                  />
                  <div className="rounded-button border border-border-soft bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">Rent terms</p>
                    <p className="mt-2 text-base font-black text-text-strong">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(request.manager_units?.rent_amount ?? 0))}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-muted">
                      {RENT_PAYMENT_FREQUENCY_LABELS[request.manager_units?.rent_frequency ?? "annual"]}
                    </p>
                    <input type="hidden" name="paymentFrequency" value={request.manager_units?.rent_frequency ?? "annual"} />
                    <input type="hidden" name="claimedRentAmount" value={request.manager_units?.rent_amount ?? 0} />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <CurrencyInput
                    label="Amount last paid"
                    name="lastPaymentAmount"
                    placeholder="0.00"
                    error={state.fieldErrors?.lastPaymentAmount?.[0]}
                    required
                  />

                  <Input
                    label="Date of last payment"
                    name="lastPaymentDate"
                    type="date"
                    max={getCurrentLagosDateOnly()}
                    error={state.fieldErrors?.lastPaymentDate?.[0]}
                    required
                  />
                </div>

                <input
                  type="hidden"
                  name="lastPaymentReceiptPath"
                  value={receiptPath}
                />
                <input
                  type="hidden"
                  name="lastPaymentReceiptFileName"
                  value={receiptFileName}
                />
                <input
                  type="hidden"
                  name="lastPaymentReceiptMimeType"
                  value={receiptMimeType}
                />
                <input
                  type="hidden"
                  name="lastPaymentReceiptSizeBytes"
                  value={receiptSizeBytes}
                />

                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-bold text-text-strong">
                    Upload last payment receipt
                  </label>
                  <div className="rounded-button border border-dashed border-border-soft bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-text-strong">
                          {receiptFileName || "No receipt uploaded"}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-text-muted">
                          PDF, JPEG, PNG, or WebP. Maximum 5MB.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        isLoading={isUploadingReceipt}
                        onClick={() => receiptInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </div>

                    <input
                      ref={receiptInputRef}
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handleReceiptUpload}
                    />
                  </div>

                  {receiptUploadMessage ? (
                    <p
                      className={
                        receiptPath
                          ? "text-sm font-semibold text-success"
                          : "text-sm font-semibold text-danger"
                      }
                    >
                      {receiptUploadMessage}
                    </p>
                  ) : null}

                  {state.fieldErrors?.lastPaymentReceiptPath?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.lastPaymentReceiptPath[0]}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            <details className="rounded-card border border-border-soft bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-primary">
                Add note
              </summary>

              <div className="mt-3 space-y-2">
                <label
                  htmlFor="tenantNotes"
                  className="text-sm font-bold text-text-strong"
                >
                  Note
                </label>

                <textarea
                  id="tenantNotes"
                  name="tenantNotes"
                  rows={3}
                  placeholder="Optional"
                  className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                />
              </div>
            </details>
          </div>

          <div className="border-t border-border-soft p-5">
            <Button type="submit" isLoading={isPending} fullWidth>
              Submit Details
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
