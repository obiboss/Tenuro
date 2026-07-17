import { z } from "zod";
import { managerTenantGuarantorInputSchema } from "@/server/validators/manager-tenant-guarantor.schema";

function blankToUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function moneyValue(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();

    return cleaned.length > 0 ? cleaned : undefined;
  }

  return value;
}

const uuidSchema = z.string().trim().uuid("Invalid record selected.");

const optionalEmailSchema = z.preprocess(
  blankToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalDateSchema = z.preprocess(
  blankToUndefined,
  dateSchema.optional(),
);

function getNigeriaDateOnly() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Nigeria date could not be determined.");
  }

  return `${year}-${month}-${day}`;
}

const optionalPastOrTodayDateSchema = optionalDateSchema.refine((value) => {
  if (!value) {
    return true;
  }

  return value <= getNigeriaDateOnly();
}, "Date cannot be in the future.");

const moneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .min(0, "Amount cannot be negative."),
);

const positiveMoneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .positive("Amount must be greater than zero."),
);

const optionalPositiveMoneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .positive("Amount must be greater than zero.")
    .optional(),
);

const optionalPaymentFrequencySchema = z.preprocess(
  blankToUndefined,
  z
    .enum(["annual", "monthly", "quarterly", "biannual"])
    .optional()
    .default("annual"),
);

export const managerOnboardingTypeSchema = z.enum([
  "current_occupant",
  "new_incoming_tenant",
]);

export const managerOnboardingIdTypeSchema = z.enum([
  "nin",
  "passport",
  "drivers_license",
  "voters_card",
]);

export const managerOnboardingPaymentFrequencySchema = z.enum([
  "annual",
  "monthly",
  "quarterly",
  "biannual",
]);

export const createManagerTenantOnboardingRequestSchema = z.object({
  landlordClientId: uuidSchema,
  propertyId: uuidSchema,
  unitId: uuidSchema,
  onboardingType: managerOnboardingTypeSchema,
  fullName: z.string().trim().min(2, "Enter the tenant name.").max(180),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter the tenant phone number.")
    .max(30),
  email: optionalEmailSchema,
  note: optionalTextSchema(600, "Note is too long."),
});

const managerTenantRequirementAnswerSchema = z
  .object({
    requirementId: uuidSchema,
    booleanAnswer: z.preprocess(
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
    numberAnswer: z.preprocess(
      blankToUndefined,
      z.preprocess(
        moneyValue,
        z.coerce
          .number()
          .finite("Enter a valid requirement answer.")
          .nonnegative("Requirement answer cannot be negative.")
          .optional(),
      ),
    ),
  })
  .superRefine((value, context) => {
    const hasBoolean = typeof value.booleanAnswer === "boolean";
    const hasNumber = typeof value.numberAnswer === "number";

    if (hasBoolean === hasNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide one valid answer for this requirement.",
      });
    }
  });

export const submitManagerTenantOnboardingRequestSchema = z.object({
  token: z.string().trim().min(20, "Invalid tenant link."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(180),
  phoneNumber: z.string().trim().min(7, "Enter your phone number.").max(30),
  email: optionalEmailSchema,
  occupation: optionalTextSchema(120, "Occupation is too long."),
  idType: managerOnboardingIdTypeSchema,
  idNumber: z.string().trim().min(3, "Enter your ID number.").max(120),
  moveInDate: optionalDateSchema,
  claimedRentAmount: optionalPositiveMoneySchema,
  lastPaymentAmount: optionalPositiveMoneySchema,
  lastPaymentDate: optionalPastOrTodayDateSchema,
  lastPaymentReceiptPath: optionalTextSchema(1000, "Receipt path is too long."),
  lastPaymentReceiptFileName: optionalTextSchema(
    255,
    "Receipt file name is too long.",
  ),
  lastPaymentReceiptMimeType: z.preprocess(
    blankToUndefined,
    z
      .enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
      .optional(),
  ),
  lastPaymentReceiptSizeBytes: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int("Receipt size is invalid.")
      .positive("Receipt size is invalid.")
      .optional(),
  ),
  paymentFrequency: optionalPaymentFrequencySchema,
  requirementAnswers: z
    .array(managerTenantRequirementAnswerSchema)
    .max(20, "Too many tenant requirement answers.")
    .default([]),
  guarantors: z
    .array(managerTenantGuarantorInputSchema)
    .max(2, "A tenant application cannot contain more than two guarantors.")
    .default([]),
  tenantNotes: optionalTextSchema(1000, "Note is too long."),
});

export const approveManagerTenantOnboardingRequestSchema = z.object({
  requestId: uuidSchema,
  confirmedRentAmount: positiveMoneySchema,
  confirmedMoveInDate: dateSchema,
  openingBalance: moneySchema.default(0),
  reviewNotes: optionalTextSchema(1000, "Review note is too long."),
});

export const rejectManagerTenantOnboardingRequestSchema = z.object({
  requestId: uuidSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export const acceptManagerTenantAgreementSchema = z.object({
  token: z.string().trim().min(20, "Invalid agreement link."),
  agreementAcknowledgement: z
    .string()
    .refine(
      (value) => value === "on",
      "Confirm that you have read and agreed to the tenancy terms.",
    ),
  propertyRulesAcknowledgement: z.preprocess(
    blankToUndefined,
    z.string().optional(),
  ),
  tenantRequirementsAcknowledgement: z.preprocess(
    blankToUndefined,
    z.string().optional(),
  ),
  guarantorAcknowledgement: z.preprocess(
    blankToUndefined,
    z.string().optional(),
  ),
});

export const declineManagerTenantAgreementSchema = z.object({
  token: z.string().trim().min(20, "Invalid agreement link."),
  reason: optionalTextSchema(500, "Reason is too long."),
});

export const resendManagerTenantOnboardingLinkSchema = z.object({
  requestId: uuidSchema,
});

export const resendManagerFirstRentPaymentLinkSchema = z.object({
  requestId: uuidSchema,
});

export type ManagerOnboardingType = z.infer<typeof managerOnboardingTypeSchema>;

export type ManagerOnboardingIdType = z.infer<
  typeof managerOnboardingIdTypeSchema
>;

export type ManagerOnboardingPaymentFrequency = z.infer<
  typeof managerOnboardingPaymentFrequencySchema
>;

export type CreateManagerTenantOnboardingRequestInput = z.infer<
  typeof createManagerTenantOnboardingRequestSchema
>;

export type SubmitManagerTenantOnboardingRequestInput = z.infer<
  typeof submitManagerTenantOnboardingRequestSchema
>;

export type ApproveManagerTenantOnboardingRequestInput = z.infer<
  typeof approveManagerTenantOnboardingRequestSchema
>;

export type RejectManagerTenantOnboardingRequestInput = z.infer<
  typeof rejectManagerTenantOnboardingRequestSchema
>;

export type AcceptManagerTenantAgreementInput = z.infer<
  typeof acceptManagerTenantAgreementSchema
>;

export type DeclineManagerTenantAgreementInput = z.infer<
  typeof declineManagerTenantAgreementSchema
>;

export type ResendManagerTenantOnboardingLinkInput = z.infer<
  typeof resendManagerTenantOnboardingLinkSchema
>;

export type ResendManagerFirstRentPaymentLinkInput = z.infer<
  typeof resendManagerFirstRentPaymentLinkSchema
>;
