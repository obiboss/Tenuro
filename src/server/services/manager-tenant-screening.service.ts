import "server-only";

import { AppError } from "@/server/errors/app-error";
import type { ManagerPropertyTenantRequirementRow } from "@/server/repositories/manager-property-requirements.repository";
import type {
  ManagerTenantRequirementAnswerItem,
  ManagerTenantRequirementSnapshotItem,
  ManagerTenantScreeningResult,
} from "@/server/repositories/manager-tenant-onboarding.repository";

export type ManagerTenantRequirementAnswerInput = {
  requirementId: string;
  booleanAnswer?: boolean;
  numberAnswer?: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildManagerTenantRequirementsSnapshot(
  requirements: ManagerPropertyTenantRequirementRow[],
): ManagerTenantRequirementSnapshotItem[] {
  return requirements.map((requirement) => ({
    id: requirement.id,
    requirementCode: requirement.requirement_code,
    title: requirement.title,
    questionText: requirement.question_text,
    description: requirement.description,
    answerType: requirement.answer_type,
    expectedBoolean: requirement.expected_boolean,
    minimumValue: requirement.minimum_value,
    maximumValue: requirement.maximum_value,
    requiredGuarantorCount: requirement.required_guarantor_count,
    mismatchAction: requirement.mismatch_action,
    includeInAgreement: requirement.include_in_agreement,
    agreementClause: requirement.agreement_clause,
  }));
}

function getMismatchReason(
  requirement: ManagerTenantRequirementSnapshotItem,
  answer: {
    booleanAnswer: boolean | null;
    numberAnswer: number | null;
  },
) {
  if (requirement.answerType === "yes_no") {
    const actual = answer.booleanAnswer ? "Yes" : "No";
    const expected = requirement.expectedBoolean ? "Yes" : "No";

    return `${requirement.title}: applicant answered ${actual}; required answer is ${expected}.`;
  }

  if (requirement.answerType === "money") {
    return `${requirement.title}: applicant stated ${formatMoney(
      answer.numberAnswer ?? 0,
    )}; minimum is ${formatMoney(requirement.minimumValue ?? 0)}.`;
  }

  return `${requirement.title}: applicant stated ${
    answer.numberAnswer ?? 0
  }; maximum allowed is ${requirement.maximumValue ?? 0}.`;
}

export function evaluateManagerTenantRequirementAnswers(params: {
  requirements: ManagerTenantRequirementSnapshotItem[];
  answers: ManagerTenantRequirementAnswerInput[];
}): {
  result: ManagerTenantScreeningResult;
  reasons: string[];
  answers: ManagerTenantRequirementAnswerItem[];
} {
  if (params.requirements.length === 0) {
    return {
      result: "eligible",
      reasons: [],
      answers: [],
    };
  }

  const requirementById = new Map(
    params.requirements.map((requirement) => [
      requirement.id,
      requirement,
    ]),
  );

  const answerByRequirementId = new Map<
    string,
    ManagerTenantRequirementAnswerInput
  >();

  for (const answer of params.answers) {
    if (!requirementById.has(answer.requirementId)) {
      throw new AppError(
        "MANAGER_TENANT_REQUIREMENT_UNKNOWN",
        "A tenant requirement answer is invalid. Refresh the page and try again.",
        400,
      );
    }

    if (answerByRequirementId.has(answer.requirementId)) {
      throw new AppError(
        "MANAGER_TENANT_REQUIREMENT_DUPLICATE",
        "A tenant requirement was answered more than once.",
        400,
      );
    }

    answerByRequirementId.set(answer.requirementId, answer);
  }

  const evaluatedAnswers: ManagerTenantRequirementAnswerItem[] =
    params.requirements.map((requirement) => {
      const answer = answerByRequirementId.get(requirement.id);

      if (!answer) {
        throw new AppError(
          "MANAGER_TENANT_REQUIREMENT_ANSWER_REQUIRED",
          `Answer the question: ${requirement.questionText}`,
          400,
        );
      }

      let booleanAnswer: boolean | null = null;
      let numberAnswer: number | null = null;
      let qualifies = false;

      if (requirement.answerType === "yes_no") {
        if (typeof answer.booleanAnswer !== "boolean") {
          throw new AppError(
            "MANAGER_TENANT_REQUIREMENT_BOOLEAN_REQUIRED",
            `Choose Yes or No for: ${requirement.questionText}`,
            400,
          );
        }

        booleanAnswer = answer.booleanAnswer;
        qualifies =
          booleanAnswer === requirement.expectedBoolean;
      } else {
        if (
          typeof answer.numberAnswer !== "number" ||
          !Number.isFinite(answer.numberAnswer)
        ) {
          throw new AppError(
            "MANAGER_TENANT_REQUIREMENT_NUMBER_REQUIRED",
            `Enter a valid answer for: ${requirement.questionText}`,
            400,
          );
        }

        numberAnswer = answer.numberAnswer;

        if (requirement.answerType === "integer") {
          if (
            !Number.isInteger(numberAnswer) ||
            numberAnswer < 1
          ) {
            throw new AppError(
              "MANAGER_TENANT_REQUIREMENT_INTEGER_REQUIRED",
              `Enter a whole number greater than zero for: ${requirement.questionText}`,
              400,
            );
          }

          qualifies =
            numberAnswer <= (requirement.maximumValue ?? 0);
        } else {
          if (numberAnswer < 0) {
            throw new AppError(
              "MANAGER_TENANT_REQUIREMENT_MONEY_REQUIRED",
              `Enter a valid amount for: ${requirement.questionText}`,
              400,
            );
          }

          qualifies =
            numberAnswer >= (requirement.minimumValue ?? 0);
        }
      }

      return {
        requirementId: requirement.id,
        requirementCode: requirement.requirementCode,
        title: requirement.title,
        questionText: requirement.questionText,
        answerType: requirement.answerType,
        booleanAnswer,
        numberAnswer,
        qualifies,
        mismatchAction: requirement.mismatchAction,
        reason: qualifies
          ? null
          : getMismatchReason(requirement, {
              booleanAnswer,
              numberAnswer,
            }),
      };
    });

  const failedAnswers = evaluatedAnswers.filter(
    (answer) => !answer.qualifies,
  );

  const result: ManagerTenantScreeningResult =
    failedAnswers.some(
      (answer) => answer.mismatchAction === "decline",
    )
      ? "declined"
      : failedAnswers.length > 0
        ? "review"
        : "eligible";

  return {
    result,
    reasons: failedAnswers.flatMap((answer) =>
      answer.reason ? [answer.reason] : [],
    ),
    answers: evaluatedAnswers,
  };
}
