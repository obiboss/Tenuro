import { z } from "zod";

const requiredText = (fieldName: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} is required.`)
    .max(220, `${fieldName} is too long.`);

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
    message: "Enter a valid amount.",
  })
  .positive("Amount must be greater than zero.")
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

export const publicAgreementPropertyUseSchema = z.enum([
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
  unitIdentifier: optionalText,
  cityState: requiredText("City/state"),

  propertyUse: publicAgreementPropertyUseSchema,
  rentAmount: moneySchema,
  cautionDepositAmount: z.coerce
    .number({
      message: "Enter a valid caution deposit amount.",
    })
    .min(0, "Caution deposit cannot be negative.")
    .max(999_999_999, "Caution deposit amount is too high."),
  agreementStartDate: dateSchema,
  agreementDuration: publicAgreementDurationSchema,

  paymentFrequency: z.enum(["annual", "six_months", "monthly"]),
  renewalNoticeDays: z.coerce
    .number()
    .int("Renewal notice must be a whole number.")
    .min(0, "Renewal notice cannot be negative.")
    .max(365, "Renewal notice is too long."),

  additionalTerms: z
    .string()
    .trim()
    .max(1500, "Additional terms are too long.")
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
