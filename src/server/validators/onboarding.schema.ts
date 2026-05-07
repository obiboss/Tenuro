import { z } from "zod";
import {
  optionalEmailSchema,
  phoneSchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

const yesNoSchema = z.enum(["yes", "no"]);

export const monthlyIncomeRangeSchema = z.enum([
  "below_100000",
  "100000_249999",
  "250000_499999",
  "500000_999999",
  "1000000_1999999",
  "2000000_and_above",
]);

export const propertyUseSchema = z.enum(["residential", "commercial"]);

function emptyToUndefined(value: unknown) {
  return value === null || value === "" ? undefined : value;
}

const optionalYesNoSchema = z.preprocess(
  emptyToUndefined,
  yesNoSchema.optional(),
);

const optionalPropertyUseSchema = z.preprocess(
  emptyToUndefined,
  propertyUseSchema.optional(),
);

const optionalMonthlyIncomeRangeSchema = z.preprocess(
  emptyToUndefined,
  monthlyIncomeRangeSchema.optional(),
);

const optionalPositiveIntegerSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).optional(),
);

export const generateOnboardingLinkSchema = z.object({
  tenantId: uuidSchema,
});

export const resolveOnboardingTokenSchema = z.object({
  token: z.string().trim().min(32, "Invalid onboarding link.").max(200),
});

export const onboardingPersonalDetailsSchema = z.object({
  token: z.string().trim().min(32).max(200),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  dateOfBirth: z.coerce.date({
    message: "Enter your date of birth.",
  }),
  homeAddress: z.string().trim().min(5, "Enter your home address.").max(300),
  occupation: z.string().trim().min(2, "Enter your occupation.").max(120),
  employer: z.string().trim().max(120).optional().or(z.literal("")),
  idType: z.enum(["nin", "passport", "drivers_license", "voters_card"], {
    message: "Select your ID type.",
  }),
  idNumber: z.string().trim().min(3, "Enter your ID number.").max(80),
});

export const onboardingDocumentsSchema = z.object({
  token: z.string().trim().min(32).max(200),
  idDocumentPath: z.string().trim().min(5, "Upload your ID document."),
  passportPhotoPath: z.string().trim().min(5, "Upload your passport photo."),
});

export const guarantorDetailsSchema = z.object({
  token: z.string().trim().min(32).max(200),
  fullName: z.string().trim().min(2, "Enter guarantor name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  address: z.string().trim().min(5, "Enter guarantor address.").max(300),
  relationshipToTenant: z
    .string()
    .trim()
    .min(2, "Enter the relationship.")
    .max(80),
  idDocumentPath: z.string().trim().optional().or(z.literal("")),
});

export const tenantOnboardingSubmissionSchema = z.object({
  token: z.string().trim().min(32).max(200),

  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  dateOfBirth: z.coerce.date({
    message: "Enter your date of birth.",
  }),
  homeAddress: z.string().trim().min(5, "Enter your home address.").max(300),
  occupation: z.string().trim().min(2, "Enter your occupation.").max(120),
  employer: z.string().trim().max(120).optional().or(z.literal("")),

  idType: z.enum(["nin", "passport", "drivers_license", "voters_card"], {
    message: "Select your ID type.",
  }),
  idNumber: z.string().trim().min(3, "Enter your ID number.").max(80),
  idDocumentPath: z.string().trim().min(5, "Upload your ID document."),
  passportPhotoPath: z.string().trim().min(5, "Upload your passport photo."),

  hasPets: optionalYesNoSchema,
  occupantCount: optionalPositiveIntegerSchema,
  propertyUse: optionalPropertyUseSchema,
  hasChildrenUnderFive: optionalYesNoSchema,
  monthlyIncomeRange: optionalMonthlyIncomeRangeSchema,
  canProvideGuarantor: optionalYesNoSchema,
  willUseShortlet: optionalYesNoSchema,
  willSublet: optionalYesNoSchema,
  willRunCustomerFacingBusiness: optionalYesNoSchema,
  willUseHeavyGeneratorOrEquipment: optionalYesNoSchema,
  willHostLargeGatherings: optionalYesNoSchema,
});

export const openingBalanceConfirmationSchema = z.object({
  token: z.string().trim().min(32).max(200),
  status: z.enum(["confirmed", "disputed"]),
  tenantDeclaredAmount: positiveMoneySchema.optional(),
});

export const invalidateOnboardingTokenSchema = z.object({
  token: z.string().trim().min(32).max(200),
});

export type GenerateOnboardingLinkInput = z.infer<
  typeof generateOnboardingLinkSchema
>;

export type ResolveOnboardingTokenInput = z.infer<
  typeof resolveOnboardingTokenSchema
>;

export type OnboardingPersonalDetailsInput = z.infer<
  typeof onboardingPersonalDetailsSchema
>;

export type OnboardingDocumentsInput = z.infer<
  typeof onboardingDocumentsSchema
>;

export type GuarantorDetailsInput = z.infer<typeof guarantorDetailsSchema>;

export type TenantOnboardingSubmissionInput = z.infer<
  typeof tenantOnboardingSubmissionSchema
>;

export type OpeningBalanceConfirmationInput = z.infer<
  typeof openingBalanceConfirmationSchema
>;

export type MonthlyIncomeRange = z.infer<typeof monthlyIncomeRangeSchema>;
