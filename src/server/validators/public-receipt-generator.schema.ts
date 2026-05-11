import { z } from "zod";

const requiredText = (fieldName: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} is required.`)
    .max(180, `${fieldName} is too long.`);

const optionalText = z
  .string()
  .trim()
  .max(180, "This field is too long.")
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

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const publicReceiptDurationSchema = z.enum([
  "6_months",
  "1_year",
  "2_years",
]);

export const publicReceiptPaymentMethodSchema = z.enum([
  "bank_transfer",
  "cash",
  "paystack_gateway",
  "other",
]);

export const publicReceiptGeneratorSchema = z.object({
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

  propertyAddress: requiredText("Property address", 5),
  propertyName: optionalText,
  unitIdentifier: optionalText,
  cityState: requiredText("City/state"),

  rentAmount: moneySchema,
  paymentDate: dateSchema,
  rentStartDate: dateSchema,
  paymentMethod: publicReceiptPaymentMethodSchema,
  rentDuration: publicReceiptDurationSchema,

  sourcePath: z.string().trim().default("/receipt-generator"),
  sourceLocation: z.string().trim().optional().or(z.literal("")),
});

export type PublicReceiptGeneratorInput = z.infer<
  typeof publicReceiptGeneratorSchema
>;

export type PublicReceiptDuration = z.infer<typeof publicReceiptDurationSchema>;
export type PublicReceiptPaymentMethod = z.infer<
  typeof publicReceiptPaymentMethodSchema
>;
