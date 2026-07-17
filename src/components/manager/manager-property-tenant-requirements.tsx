"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { saveManagerPropertyTenantRequirementsAction } from "@/actions/manager-property-requirements.actions";
import {
  initialManagerActionState,
  type ManagerActionState,
} from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import type { ManagerPropertyTenantRequirementRow } from "@/server/repositories/manager-property-requirements.repository";
import type {
  ManagerTenantRequirementAnswerType,
  ManagerTenantRequirementCode,
  ManagerTenantRequirementMismatchAction,
} from "@/server/validators/manager-property-requirements.schema";

type Props = {
  propertyId: string;
  landlordClientId: string;
  initialRequirements: ManagerPropertyTenantRequirementRow[];
};

type RequirementDraft = {
  id: string;
  requirementCode: ManagerTenantRequirementCode;
  title: string;
  questionText: string;
  description: string;
  answerType: ManagerTenantRequirementAnswerType;
  expectedBoolean: boolean;
  minimumValue: string;
  maximumValue: string;
  requiredGuarantorCount: string;
  mismatchAction: ManagerTenantRequirementMismatchAction;
  includeInAgreement: boolean;
  agreementClause: string;
};

type RequirementPreset = Omit<
  RequirementDraft,
  "id"
> & {
  buttonLabel: string;
};

const PRESETS: RequirementPreset[] = [
  {
    buttonLabel: "Pets",
    requirementCode: "pets",
    title: "Pets",
    questionText: "Will any pets live in the property?",
    description:
      "Confirm whether the applicant intends to keep pets.",
    answerType: "yes_no",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: true,
    agreementClause:
      "The tenant shall not keep pets in the property without the landlord or property manager's written approval.",
  },
  {
    buttonLabel: "Subletting",
    requirementCode: "subletting",
    title: "No subletting",
    questionText:
      "Do you intend to rent out or transfer any part of the property to another person?",
    description:
      "Screens applicants who plan to sublet the property.",
    answerType: "yes_no",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "decline",
    includeInAgreement: true,
    agreementClause:
      "The tenant shall not sublet, assign, or transfer possession of any part of the property without written approval.",
  },
  {
    buttonLabel: "Minimum income",
    requirementCode: "minimum_monthly_income",
    title: "Minimum monthly income",
    questionText: "What is your average monthly income?",
    description:
      "Compares the applicant's stated monthly income with the property requirement.",
    answerType: "money",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: false,
    agreementClause: "",
  },
  {
    buttonLabel: "Employment",
    requirementCode: "employment_required",
    title: "Employment or stable business",
    questionText:
      "Are you currently employed or running an active business?",
    description:
      "Confirms that the applicant has an active income source.",
    answerType: "yes_no",
    expectedBoolean: true,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: false,
    agreementClause: "",
  },
  {
    buttonLabel: "Occupants",
    requirementCode: "maximum_occupants",
    title: "Maximum occupants",
    questionText:
      "How many people will live in the property, including you?",
    description:
      "Compares the intended household size with the property's capacity.",
    answerType: "integer",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: true,
    agreementClause:
      "The number of occupants shall not exceed the approved number recorded for this tenancy without written approval.",
  },
  {
    buttonLabel: "Business use",
    requirementCode: "business_use",
    title: "Residential use only",
    questionText:
      "Do you intend to operate a business from the property?",
    description:
      "Screens intended commercial use of a residential property.",
    answerType: "yes_no",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: true,
    agreementClause:
      "The property shall be used only for the approved purpose and not for an unapproved business activity.",
  },
  {
    buttonLabel: "Smoking",
    requirementCode: "smoking",
    title: "No smoking",
    questionText:
      "Will anyone smoke inside the property?",
    description:
      "Confirms whether smoking is intended inside the property.",
    answerType: "yes_no",
    expectedBoolean: false,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: true,
    agreementClause:
      "Smoking inside the property is prohibited.",
  },
  {
    buttonLabel: "Guarantor",
    requirementCode: "guarantor_required",
    title: "Guarantor required",
    questionText:
      "Can you provide the required guarantor details?",
    description:
      "Requires the applicant to provide verified guarantor information.",
    answerType: "yes_no",
    expectedBoolean: true,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "1",
    mismatchAction: "decline",
    includeInAgreement: true,
    agreementClause:
      "The tenancy remains subject to the approved guarantor accepting the guarantor obligations.",
  },
  {
    buttonLabel: "Custom yes/no",
    requirementCode: "custom_yes_no",
    title: "",
    questionText: "",
    description: "",
    answerType: "yes_no",
    expectedBoolean: true,
    minimumValue: "",
    maximumValue: "",
    requiredGuarantorCount: "",
    mismatchAction: "review",
    includeInAgreement: false,
    agreementClause: "",
  },
];

function createDraftId() {
  return crypto.randomUUID();
}

function fromStoredRequirement(
  requirement: ManagerPropertyTenantRequirementRow,
): RequirementDraft {
  return {
    id: requirement.id,
    requirementCode: requirement.requirement_code,
    title: requirement.title,
    questionText: requirement.question_text,
    description: requirement.description ?? "",
    answerType: requirement.answer_type,
    expectedBoolean:
      requirement.expected_boolean ?? false,
    minimumValue:
      requirement.minimum_value === null
        ? ""
        : String(requirement.minimum_value),
    maximumValue:
      requirement.maximum_value === null
        ? ""
        : String(requirement.maximum_value),
    requiredGuarantorCount:
      requirement.required_guarantor_count === null
        ? ""
        : String(
            requirement.required_guarantor_count,
          ),
    mismatchAction: requirement.mismatch_action,
    includeInAgreement:
      requirement.include_in_agreement,
    agreementClause:
      requirement.agreement_clause ?? "",
  };
}

function createRequirementDraft(
  preset: RequirementPreset,
): RequirementDraft {
  return {
    id: createDraftId(),
    requirementCode: preset.requirementCode,
    title: preset.title,
    questionText: preset.questionText,
    description: preset.description,
    answerType: preset.answerType,
    expectedBoolean: preset.expectedBoolean,
    minimumValue: preset.minimumValue,
    maximumValue: preset.maximumValue,
    requiredGuarantorCount:
      preset.requiredGuarantorCount,
    mismatchAction: preset.mismatchAction,
    includeInAgreement:
      preset.includeInAgreement,
    agreementClause: preset.agreementClause,
  };
}

function cloneRequirements(
  requirements: RequirementDraft[],
) {
  return requirements.map((requirement) => ({
    ...requirement,
  }));
}

function getRequirementSummary(
  requirement: RequirementDraft,
) {
  const outcome =
    requirement.mismatchAction === "decline"
      ? "Declines application if the answer does not qualify"
      : "Sends application for review if the answer does not qualify";
  const clause = requirement.includeInAgreement
    ? " · Clause added"
    : "";

  return `${outcome}${clause}`;
}

export function ManagerPropertyTenantRequirements({
  propertyId,
  landlordClientId,
  initialRequirements,
}: Props) {
  const router = useRouter();
  const initialDrafts = useMemo(
    () =>
      initialRequirements.map(
        fromStoredRequirement,
      ),
    [initialRequirements],
  );
  const [requirements, setRequirements] = useState<
    RequirementDraft[]
  >(initialDrafts);
  const [savedRequirements, setSavedRequirements] =
    useState<RequirementDraft[]>(initialDrafts);
  const [
    editingRequirementId,
    setEditingRequirementId,
  ] = useState<string | null>(null);
  const [dismissedToastId, setDismissedToastId] =
    useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: ManagerActionState,
      formData: FormData,
    ) => {
      const result =
        await saveManagerPropertyTenantRequirementsAction(
          previousState,
          formData,
        );

      if (result.ok) {
        const savedSnapshot =
          cloneRequirements(requirements);
        setSavedRequirements(savedSnapshot);
        setRequirements(savedSnapshot);
        setEditingRequirementId(null);
        router.refresh();
      }

      return result;
    },
    initialManagerActionState,
  );

  const requirementsJson = useMemo(
    () =>
      JSON.stringify(
        requirements.map((requirement) => ({
          requirementCode:
            requirement.requirementCode,
          title: requirement.title,
          questionText:
            requirement.questionText,
          description: requirement.description,
          answerType: requirement.answerType,
          expectedBoolean:
            requirement.answerType === "yes_no"
              ? requirement.expectedBoolean
              : undefined,
          minimumValue:
            requirement.answerType === "money"
              ? requirement.minimumValue
              : undefined,
          maximumValue:
            requirement.answerType === "integer"
              ? requirement.maximumValue
              : undefined,
          requiredGuarantorCount:
            requirement.requirementCode ===
            "guarantor_required"
              ? requirement.requiredGuarantorCount
              : undefined,
          mismatchAction:
            requirement.mismatchAction,
          includeInAgreement:
            requirement.includeInAgreement,
          agreementClause:
            requirement.includeInAgreement
              ? requirement.agreementClause
              : undefined,
        })),
      ),
    [requirements],
  );

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = [
      "tenant-requirements",
      state.ok ? "success" : "error",
      state.submissionId ?? state.message,
    ].join("-");

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok
        ? "Requirements saved"
        : "Could not save requirements",
      description: state.message,
    };
  }, [
    dismissedToastId,
    state.message,
    state.ok,
    state.submissionId,
  ]);

  function openRequirementEditor(id: string) {
    setEditingRequirementId(id);

    window.requestAnimationFrame(() => {
      document
        .getElementById(
          `property-requirement-${id}`,
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  function handlePresetClick(
    preset: RequirementPreset,
  ) {
    const existingRequirement =
      requirements.find(
        (requirement) =>
          requirement.requirementCode ===
          preset.requirementCode,
      );

    if (existingRequirement) {
      openRequirementEditor(
        existingRequirement.id,
      );
      return;
    }

    const newRequirement =
      createRequirementDraft(preset);

    setRequirements((current) => [
      ...current,
      newRequirement,
    ]);
    openRequirementEditor(newRequirement.id);
  }

  function updateRequirement(
    id: string,
    update: (
      requirement: RequirementDraft,
    ) => RequirementDraft,
  ) {
    setRequirements((current) =>
      current.map((requirement) =>
        requirement.id === id
          ? update(requirement)
          : requirement,
      ),
    );
  }

  function removeRequirement(id: string) {
    setRequirements((current) =>
      current.filter(
        (requirement) =>
          requirement.id !== id,
      ),
    );

    if (editingRequirementId === id) {
      setEditingRequirementId(null);
    }
  }

  function cancelChanges() {
    setRequirements(
      cloneRequirements(savedRequirements),
    );
    setEditingRequirementId(null);
  }

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast
            toast={toast}
            onDismiss={setDismissedToastId}
          />
        </div>
      ) : null}

      <form
        action={formAction}
        className="rounded-card border border-border-soft bg-white shadow-sm"
      >
        <input
          type="hidden"
          name="propertyId"
          value={propertyId}
        />
        <input
          type="hidden"
          name="landlordClientId"
          value={landlordClientId}
        />
        <input
          type="hidden"
          name="requirementsJson"
          value={requirementsJson}
        />

        <div className="border-b border-border-soft p-4">
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Tenant requirements
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            These requirements become questions during a
            new tenant&apos;s application.
          </p>
        </div>

        <div className="space-y-5 p-4">
          <div>
            <p className="text-sm font-black text-text-strong">
              Add a requirement
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const existingRequirement =
                  requirements.find(
                    (requirement) =>
                      requirement.requirementCode ===
                      preset.requirementCode,
                  );
                const alreadyAdded = Boolean(
                  existingRequirement,
                );

                return (
                  <button
                    key={preset.requirementCode}
                    type="button"
                    aria-pressed={alreadyAdded}
                    onClick={() =>
                      handlePresetClick(preset)
                    }
                    className={
                      alreadyAdded
                        ? "inline-flex min-h-10 items-center gap-2 rounded-button border border-primary/30 bg-primary-soft px-3 text-sm font-extrabold text-primary transition hover:bg-primary-soft/70"
                        : "inline-flex min-h-10 items-center rounded-button border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                    }
                  >
                    {alreadyAdded ? (
                      <Check
                        className="size-4"
                        aria-hidden="true"
                      />
                    ) : null}
                    {preset.buttonLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-card bg-warning-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Use objective property requirements only
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Do not create requirements based on
              ethnicity, religion, disability, gender,
              marital status, or other protected personal
              characteristics.
            </p>
          </div>

          {requirements.length > 0 ? (
            <div className="overflow-hidden rounded-card border border-border-soft">
              {requirements.map((requirement) => {
                const isEditing =
                  editingRequirementId ===
                  requirement.id;

                return (
                  <article
                    id={`property-requirement-${requirement.id}`}
                    key={requirement.id}
                    className="border-b border-border-soft bg-white last:border-b-0"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-black text-text-strong">
                            {requirement.title ||
                              "Custom requirement"}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                            {getRequirementSummary(
                              requirement,
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${
                              requirement.title ||
                              "custom requirement"
                            }`}
                            title="Edit requirement"
                            onClick={() =>
                              openRequirementEditor(
                                requirement.id,
                              )
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-text-strong transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Pencil
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${
                              requirement.title ||
                              "custom requirement"
                            }`}
                            title="Delete requirement"
                            onClick={() =>
                              removeRequirement(
                                requirement.id,
                              )
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                          >
                            <Trash2
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 bg-surface/40 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-black text-text-strong">
                              {requirement.title ||
                                "New requirement"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-text-muted">
                              Editing
                            </p>
                          </div>

                          <button
                            type="button"
                            aria-label="Delete requirement"
                            title="Delete requirement"
                            onClick={() =>
                              removeRequirement(
                                requirement.id,
                              )
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                          >
                            <Trash2
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>

                        <section className="space-y-4 rounded-card border border-border-soft bg-white p-4">
                          <div>
                            <h3 className="text-sm font-black text-text-strong">
                              What the tenant sees
                            </h3>
                            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                              These fields appear in the
                              tenant&apos;s application.
                            </p>
                          </div>

                          <Input
                            label="Requirement title"
                            value={requirement.title}
                            onChange={(event) =>
                              updateRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  title:
                                    event.target.value,
                                }),
                              )
                            }
                            placeholder="Example: No pets"
                            required
                          />

                          <div className="space-y-2">
                            <label
                              htmlFor={`question-${requirement.id}`}
                              className="text-sm font-bold text-text-strong"
                            >
                              Question shown to the tenant
                            </label>

                            <textarea
                              id={`question-${requirement.id}`}
                              value={
                                requirement.questionText
                              }
                              onChange={(event) =>
                                updateRequirement(
                                  requirement.id,
                                  (current) => ({
                                    ...current,
                                    questionText:
                                      event.target.value,
                                  }),
                                )
                              }
                              rows={2}
                              required
                              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {requirement.answerType ===
                            "yes_no" ? (
                              <div className="space-y-2">
                                <label
                                  htmlFor={`expected-${requirement.id}`}
                                  className="text-sm font-bold text-text-strong"
                                >
                                  Answer that qualifies
                                </label>

                                <select
                                  id={`expected-${requirement.id}`}
                                  value={
                                    requirement.expectedBoolean
                                      ? "true"
                                      : "false"
                                  }
                                  onChange={(event) =>
                                    updateRequirement(
                                      requirement.id,
                                      (current) => ({
                                        ...current,
                                        expectedBoolean:
                                          event.target
                                            .value ===
                                          "true",
                                      }),
                                    )
                                  }
                                  className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                                >
                                  <option value="true">
                                    Yes
                                  </option>
                                  <option value="false">
                                    No
                                  </option>
                                </select>
                              </div>
                            ) : requirement.answerType ===
                              "money" ? (
                              <CurrencyInput
                                label="Minimum monthly income"
                                name={`minimum-income-${requirement.id}`}
                                value={
                                  requirement.minimumValue
                                }
                                onValueChange={(value) =>
                                  updateRequirement(
                                    requirement.id,
                                    (current) => ({
                                      ...current,
                                      minimumValue: value,
                                    }),
                                  )
                                }
                                placeholder="0"
                                required
                              />
                            ) : (
                              <Input
                                label="Maximum number of occupants"
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  requirement.maximumValue
                                }
                                onChange={(event) =>
                                  updateRequirement(
                                    requirement.id,
                                    (current) => ({
                                      ...current,
                                      maximumValue:
                                        event.target.value,
                                    }),
                                  )
                                }
                                required
                              />
                            )}

                            <div className="space-y-2">
                              <label
                                htmlFor={`mismatch-${requirement.id}`}
                                className="text-sm font-bold text-text-strong"
                              >
                                If disqualified
                              </label>

                              <select
                                id={`mismatch-${requirement.id}`}
                                value={
                                  requirement.mismatchAction
                                }
                                onChange={(event) =>
                                  updateRequirement(
                                    requirement.id,
                                    (current) => ({
                                      ...current,
                                      mismatchAction:
                                        event.target
                                          .value as ManagerTenantRequirementMismatchAction,
                                    }),
                                  )
                                }
                                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                              >
                                <option value="review">
                                  Send to manager for
                                  review
                                </option>
                                <option value="decline">
                                  Decline the application
                                </option>
                              </select>
                            </div>
                          </div>

                          {requirement.requirementCode ===
                          "guarantor_required" ? (
                            <div className="max-w-sm space-y-2">
                              <label
                                htmlFor={`guarantors-${requirement.id}`}
                                className="text-sm font-bold text-text-strong"
                              >
                                Number of guarantors
                                required
                              </label>

                              <select
                                id={`guarantors-${requirement.id}`}
                                value={
                                  requirement.requiredGuarantorCount
                                }
                                onChange={(event) =>
                                  updateRequirement(
                                    requirement.id,
                                    (current) => ({
                                      ...current,
                                      requiredGuarantorCount:
                                        event.target.value,
                                    }),
                                  )
                                }
                                className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                              >
                                <option value="1">
                                  One guarantor
                                </option>
                                <option value="2">
                                  Two guarantors
                                </option>
                              </select>
                            </div>
                          ) : null}
                        </section>

                        <section className="space-y-4 rounded-card border border-border-soft bg-white p-4">
                          <div className="flex flex-wrap items-baseline gap-1">
                            <h3 className="text-sm font-black text-text-strong">
                              Internal note
                            </h3>
                            <span className="text-xs font-semibold text-text-muted">
                              · not shown to tenant
                            </span>
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor={`description-${requirement.id}`}
                              className="text-sm font-bold text-text-strong"
                            >
                              Internal explanation
                            </label>

                            <textarea
                              id={`description-${requirement.id}`}
                              value={
                                requirement.description
                              }
                              onChange={(event) =>
                                updateRequirement(
                                  requirement.id,
                                  (current) => ({
                                    ...current,
                                    description:
                                      event.target.value,
                                  }),
                                )
                              }
                              rows={2}
                              placeholder="Optional"
                              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            />
                          </div>
                        </section>

                        <section className="space-y-4 rounded-card border border-border-soft bg-white p-4">
                          <div>
                            <h3 className="text-sm font-black text-text-strong">
                              Tenancy agreement
                            </h3>
                            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
                              Decide whether this rule
                              should also appear in the
                              agreement.
                            </p>
                          </div>

                          <label className="flex gap-3 rounded-card border border-border-soft bg-surface/60 p-4 text-sm font-semibold leading-6 text-text-strong">
                            <input
                              type="checkbox"
                              checked={
                                requirement.includeInAgreement
                              }
                              onChange={(event) =>
                                updateRequirement(
                                  requirement.id,
                                  (current) => ({
                                    ...current,
                                    includeInAgreement:
                                      event.target.checked,
                                  }),
                                )
                              }
                              className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                            />
                            <span>
                              Reinforce this requirement in
                              the tenancy agreement.
                            </span>
                          </label>

                          {requirement.includeInAgreement ? (
                            <div className="space-y-2">
                              <label
                                htmlFor={`clause-${requirement.id}`}
                                className="text-sm font-bold text-text-strong"
                              >
                                Agreement clause
                              </label>

                              <textarea
                                id={`clause-${requirement.id}`}
                                value={
                                  requirement.agreementClause
                                }
                                onChange={(event) =>
                                  updateRequirement(
                                    requirement.id,
                                    (current) => ({
                                      ...current,
                                      agreementClause:
                                        event.target.value,
                                    }),
                                  )
                                }
                                rows={3}
                                required
                                className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                              />
                            </div>
                          ) : null}
                        </section>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-card bg-surface p-4">
              <p className="font-black text-text-strong">
                No tenant requirements
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                New tenant applications will use the
                standard KYC form only.
              </p>
            </div>
          )}

          {state.fieldErrors?.requirements?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.requirements[0]}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border-soft p-4">
          <Button
            type="button"
            variant="secondary"
            onClick={cancelChanges}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            isLoading={isPending}
            className="min-w-40"
          >
            Save requirements
          </Button>
        </div>
      </form>
    </>
  );
}
