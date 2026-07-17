import { z } from "zod";

function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function numericValue(value: unknown) {
  if (typeof value === "string") {
    return value.replace(/,/g, "").trim();
  }

  return value;
}

const uuidSchema = z.string().trim().uuid("Invalid record selected.");

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const booleanFromFormSchema = z.preprocess(
  (value) =>
    value === true ||
    value === "true" ||
    value === "on" ||
    value === "1",
  z.boolean(),
);

export const managerTenantRequirementCodeSchema = z.enum([
  "pets",
  "subletting",
  "minimum_monthly_income",
  "employment_required",
  "maximum_occupants",
  "business_use",
  "smoking",
  "guarantor_required",
  "custom_yes_no",
]);

export const managerTenantRequirementAnswerTypeSchema = z.enum([
  "yes_no",
  "money",
  "integer",
]);

export const managerTenantRequirementMismatchActionSchema = z.enum([
  "review",
  "decline",
]);

const requirementSchema = z
  .object({
    requirementCode: managerTenantRequirementCodeSchema,
    title: z
      .string()
      .trim()
      .min(1, "Enter the requirement title.")
      .max(120, "Requirement title is too long."),
    questionText: z
      .string()
      .trim()
      .min(1, "Enter the question shown to the tenant.")
      .max(240, "Tenant question is too long."),
    description: optionalTextSchema(
      500,
      "Requirement description is too long.",
    ),
    answerType: managerTenantRequirementAnswerTypeSchema,
    expectedBoolean: z.preprocess(
      blankToUndefined,
      z
        .union([z.boolean(), z.enum(["true", "false"])])
        .optional()
        .transform((value) => {
          if (value === undefined) {
            return undefined;
          }

          return value === true || value === "true";
        }),
    ),
    minimumValue: z.preprocess(
      blankToUndefined,
      z.preprocess(
        numericValue,
        z.coerce
          .number()
          .finite("Enter a valid minimum value.")
          .nonnegative("Minimum value cannot be negative.")
          .optional(),
      ),
    ),
    maximumValue: z.preprocess(
      blankToUndefined,
      z.preprocess(
        numericValue,
        z.coerce
          .number()
          .int("Maximum value must be a whole number.")
          .positive("Maximum value must be greater than zero.")
          .optional(),
      ),
    ),
    requiredGuarantorCount: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int()
        .min(1)
        .max(2)
        .optional(),
    ),
    mismatchAction: managerTenantRequirementMismatchActionSchema,
    includeInAgreement: booleanFromFormSchema,
    agreementClause: optionalTextSchema(
      1000,
      "Agreement clause is too long.",
    ),
  })
  .superRefine((requirement, context) => {
    if (
      requirement.answerType === "yes_no" &&
      requirement.expectedBoolean === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedBoolean"],
        message: "Choose the accepted answer.",
      });
    }

    if (
      requirement.answerType === "money" &&
      requirement.minimumValue === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumValue"],
        message: "Enter the minimum monthly income.",
      });
    }

    if (
      requirement.answerType === "integer" &&
      requirement.maximumValue === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maximumValue"],
        message: "Enter the maximum number allowed.",
      });
    }

    if (
      requirement.requirementCode === "guarantor_required" &&
      requirement.requiredGuarantorCount === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredGuarantorCount"],
        message: "Choose how many guarantors are required.",
      });
    }

    if (
      requirement.includeInAgreement &&
      !requirement.agreementClause
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreementClause"],
        message: "Enter the clause that will appear in the agreement.",
      });
    }
  })
  .transform((requirement) => ({
    ...requirement,
    expectedBoolean:
      requirement.answerType === "yes_no"
        ? (requirement.expectedBoolean ?? false)
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
      requirement.requirementCode === "guarantor_required"
        ? requirement.requiredGuarantorCount
        : undefined,
  }));

export const saveManagerPropertyTenantRequirementsSchema = z
  .object({
    propertyId: uuidSchema,
    landlordClientId: uuidSchema,
    requirements: z
      .array(requirementSchema)
      .max(20, "A property cannot have more than 20 active requirements."),
  })
  .superRefine((value, context) => {
    const presetCodes = new Set<string>();
    const questions = new Set<string>();

    value.requirements.forEach((requirement, index) => {
      const normalizedQuestion =
        requirement.questionText.toLocaleLowerCase("en-NG");

      if (questions.has(normalizedQuestion)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requirements", index, "questionText"],
          message: "Tenant questions must be unique.",
        });
      }

      questions.add(normalizedQuestion);

      if (requirement.requirementCode === "custom_yes_no") {
        return;
      }

      if (presetCodes.has(requirement.requirementCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requirements", index, "requirementCode"],
          message: "This requirement has already been added.",
        });
      }

      presetCodes.add(requirement.requirementCode);
    });
  });

export type ManagerTenantRequirementCode = z.infer<
  typeof managerTenantRequirementCodeSchema
>;

export type ManagerTenantRequirementAnswerType = z.infer<
  typeof managerTenantRequirementAnswerTypeSchema
>;

export type ManagerTenantRequirementMismatchAction = z.infer<
  typeof managerTenantRequirementMismatchActionSchema
>;

export type SaveManagerPropertyTenantRequirementsInput = z.infer<
  typeof saveManagerPropertyTenantRequirementsSchema
>;
