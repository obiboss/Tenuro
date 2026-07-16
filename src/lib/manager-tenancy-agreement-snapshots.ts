export type ManagerAgreementRequirementSnapshotItem = {
  id: string;
  requirementCode: string;
  title: string;
  questionText: string;
  answerType: "yes_no" | "money" | "integer";
  booleanAnswer: boolean | null;
  numberAnswer: number | null;
  qualifies: boolean;
  mismatchAction: "review" | "decline";
  agreementClause: string;
  answerLabel: string;
  approvedAfterReview: boolean;
};

export type ManagerAgreementGuarantorSnapshotItem = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  relationshipToTenant: string;
  occupation: string;
  employerOrBusiness: string | null;
  confirmedAt: string;
};

type AgreementLike = {
  property_snapshot: Record<string, unknown>;
  tenant_snapshot: Record<string, unknown>;
  tenancy_snapshot: Record<string, unknown>;
};

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function formatAnswerLabel(params: {
  requirementCode: string;
  answerType: ManagerAgreementRequirementSnapshotItem["answerType"];
  booleanAnswer: boolean | null;
  numberAnswer: number | null;
}) {
  if (params.answerType === "yes_no") {
    if (params.booleanAnswer === null) {
      return "Tenant answer recorded during application.";
    }

    return `Tenant answer: ${params.booleanAnswer ? "Yes" : "No"}`;
  }

  if (params.answerType === "integer") {
    if (params.numberAnswer === null) {
      return "Tenant answer recorded during application.";
    }

    if (params.requirementCode === "maximum_occupants") {
      return `Approved occupants: ${Math.trunc(params.numberAnswer)}`;
    }

    return `Tenant answer: ${Math.trunc(params.numberAnswer)}`;
  }

  return "Income requirement assessed during application.";
}

function parseStoredRequirement(
  value: unknown,
): ManagerAgreementRequirementSnapshotItem | null {
  const item = asRecord(value);

  if (!item) {
    return null;
  }

  const id = asText(item.id);
  const title = asText(item.title);
  const questionText = asText(item.questionText);
  const agreementClause = asText(item.agreementClause);
  const answerType =
    item.answerType === "money" || item.answerType === "integer"
      ? item.answerType
      : "yes_no";

  if (!id || !title || !questionText || !agreementClause) {
    return null;
  }

  const requirementCode =
    asText(item.requirementCode) ?? "custom_yes_no";
  const booleanAnswer = asBoolean(item.booleanAnswer);
  const numberAnswer = asNumber(item.numberAnswer);
  const qualifies = item.qualifies !== false;
  const mismatchAction =
    item.mismatchAction === "decline" ? "decline" : "review";

  return {
    id,
    requirementCode,
    title,
    questionText,
    answerType,
    booleanAnswer,
    numberAnswer,
    qualifies,
    mismatchAction,
    agreementClause,
    answerLabel:
      asText(item.answerLabel) ??
      formatAnswerLabel({
        requirementCode,
        answerType,
        booleanAnswer,
        numberAnswer,
      }),
    approvedAfterReview: item.approvedAfterReview === true,
  };
}

export function buildManagerAgreementRequirementSnapshots(params: {
  requirements: unknown;
  answers: unknown;
  screeningResult: unknown;
}) {
  const requirements = Array.isArray(params.requirements)
    ? params.requirements
    : [];
  const answers = Array.isArray(params.answers) ? params.answers : [];
  const answerByRequirementId = new Map<string, Record<string, unknown>>();

  answers.forEach((value) => {
    const answer = asRecord(value);
    const requirementId = answer
      ? asText(answer.requirementId)
      : null;

    if (answer && requirementId) {
      answerByRequirementId.set(requirementId, answer);
    }
  });

  return requirements.flatMap((value) => {
    const requirement = asRecord(value);

    if (!requirement || requirement.includeInAgreement !== true) {
      return [];
    }

    const id = asText(requirement.id);
    const title = asText(requirement.title);
    const questionText = asText(requirement.questionText);
    const agreementClause = asText(requirement.agreementClause);

    if (!id || !title || !questionText || !agreementClause) {
      return [];
    }

    const answer = answerByRequirementId.get(id);
    const requirementCode =
      asText(requirement.requirementCode) ?? "custom_yes_no";
    const answerType =
      requirement.answerType === "money" ||
      requirement.answerType === "integer"
        ? requirement.answerType
        : "yes_no";
    const booleanAnswer = answer
      ? asBoolean(answer.booleanAnswer)
      : null;
    const numberAnswer = answer
      ? asNumber(answer.numberAnswer)
      : null;
    const qualifies = answer?.qualifies !== false;
    const mismatchAction =
      requirement.mismatchAction === "decline"
        ? "decline"
        : "review";

    return [
      {
        id,
        requirementCode,
        title,
        questionText,
        answerType,
        booleanAnswer,
        numberAnswer,
        qualifies,
        mismatchAction,
        agreementClause,
        answerLabel: formatAnswerLabel({
          requirementCode,
          answerType,
          booleanAnswer,
          numberAnswer,
        }),
        approvedAfterReview:
          qualifies === false && params.screeningResult === "review",
      } satisfies ManagerAgreementRequirementSnapshotItem,
    ];
  });
}

export function getManagerAgreementRequirementSnapshots(
  agreement: AgreementLike,
) {
  const stored =
    agreement.tenancy_snapshot.agreementRequirements ??
    agreement.property_snapshot.agreementRequirements;

  if (Array.isArray(stored)) {
    const parsed = stored
      .map(parseStoredRequirement)
      .filter(
        (
          item,
        ): item is ManagerAgreementRequirementSnapshotItem =>
          item !== null,
      );

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return buildManagerAgreementRequirementSnapshots({
    requirements:
      agreement.tenancy_snapshot.tenantRequirements ??
      agreement.property_snapshot.tenantRequirements,
    answers: agreement.tenancy_snapshot.requirementAnswers,
    screeningResult: agreement.tenancy_snapshot.screeningResult,
  });
}

function parseGuarantor(
  value: unknown,
): ManagerAgreementGuarantorSnapshotItem | null {
  const guarantor = asRecord(value);

  if (!guarantor) {
    return null;
  }

  const id = asText(guarantor.id);
  const fullName = asText(guarantor.fullName);
  const phoneNumber = asText(guarantor.phoneNumber);
  const relationshipToTenant = asText(
    guarantor.relationshipToTenant,
  );
  const occupation = asText(guarantor.occupation);
  const confirmedAt = asText(guarantor.confirmedAt);

  if (
    !id ||
    !fullName ||
    !phoneNumber ||
    !relationshipToTenant ||
    !occupation ||
    !confirmedAt
  ) {
    return null;
  }

  return {
    id,
    fullName,
    phoneNumber,
    email: asText(guarantor.email),
    relationshipToTenant,
    occupation,
    employerOrBusiness: asText(guarantor.employerOrBusiness),
    confirmedAt,
  };
}

export function getManagerAgreementGuarantors(
  agreement: AgreementLike,
) {
  const stored =
    agreement.tenancy_snapshot.guarantors ??
    agreement.tenant_snapshot.guarantors;

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .map(parseGuarantor)
    .filter(
      (
        item,
      ): item is ManagerAgreementGuarantorSnapshotItem =>
        item !== null,
    );
}
