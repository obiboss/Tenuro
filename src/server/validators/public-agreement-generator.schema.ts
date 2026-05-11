import { z } from "zod";

const requiredText = (fieldName: string, min = 2, max = 220) =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} is required.`)
    .max(max, `${fieldName} is too long.`);

const optionalText = z
  .string()
  .trim()
  .max(220, "This field is too long.")
  .optional()
  .or(z.literal(""));

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid Nigerian phone number.")
  .max(20, "Phone number is too long.");

const moneySchema = z.coerce
  .number({
    message: "Enter a valid rent amount.",
  })
  .positive("Rent amount must be greater than zero.")
  .max(999_999_999, "Rent amount is too high.");

const optionalMoneySchema = z.coerce
  .number({
    message: "Enter a valid amount.",
  })
  .min(0, "Amount cannot be negative.")
  .max(999_999_999, "Amount is too high.");

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const publicAgreementDurationSchema = z.enum([
  "6_months",
  "1_year",
  "2_years",
]);

export const publicAgreementRentFrequencySchema = z.enum([
  "annual",
  "monthly",
  "quarterly",
  "biannual",
]);

export const publicAgreementUseSchema = z.enum([
  "residential",
  "commercial",
  "mixed_use",
]);

export const publicAgreementGeneratorSchema = z.object({
  landlordFullName: requiredText("Landlord full name"),
  landlordPhoneNumber: phoneSchema,
  landlordEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),

  tenantFullName: requiredText("Tenant full name"),
  tenantPhoneNumber: phoneSchema,
  tenantEmail: z
    .string()
    .trim()
    .email("Enter a valid tenant email address.")
    .optional()
    .or(z.literal("")),

  propertyName: optionalText,
  propertyAddress: requiredText("Property address", 5),
  unitIdentifier: requiredText("Unit / flat / shop", 1),
  cityState: requiredText("City/state"),
  propertyUse: publicAgreementUseSchema,

  tenancyStartDate: dateSchema,
  tenancyDuration: publicAgreementDurationSchema,
  rentAmount: moneySchema,
  rentFrequency: publicAgreementRentFrequencySchema,
  cautionDepositAmount: optionalMoneySchema.default(0),
  renewalNoticeDays: z.coerce
    .number()
    .int("Renewal notice must be a whole number.")
    .min(0, "Renewal notice cannot be negative.")
    .max(365, "Renewal notice is too long."),

  propertyRules: z
    .string()
    .trim()
    .max(1800, "Property rules are too long.")
    .optional()
    .or(z.literal("")),

  specialTerms: z
    .string()
    .trim()
    .max(1800, "Special terms are too long.")
    .optional()
    .or(z.literal("")),

  sourcePath: z.string().trim().default("/agreement-generator"),
});

export type PublicAgreementGeneratorInput = z.infer<
  typeof publicAgreementGeneratorSchema
>;

export type PublicAgreementDuration = z.infer<
  typeof publicAgreementDurationSchema
>;

export type PublicAgreementRentFrequency = z.infer<
  typeof publicAgreementRentFrequencySchema
>;

export type PublicAgreementUse = z.infer<typeof publicAgreementUseSchema>;
