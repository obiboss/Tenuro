import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, "Enter a valid 10 digit account number.");

const contactPhoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid contact phone number.")
  .max(20, "Contact phone number is too long.");

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

export const saveManagerOrganizationPaystackAccountSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter the business name.")
    .max(120, "Business name is too long."),
  contactName: z
    .string()
    .trim()
    .min(2, "Enter the contact name.")
    .max(120, "Contact name is too long."),
  contactPhone: contactPhoneSchema,
  contactEmail: optionalEmailSchema,
  bankCode: z.string().trim().min(1, "Enter the bank code."),
  bankName: z
    .string()
    .trim()
    .min(2, "Enter the bank name.")
    .max(120, "Bank name is too long."),
  accountNumber: accountNumberSchema,
});

export const saveManagerLandlordPaystackAccountSchema =
  saveManagerOrganizationPaystackAccountSchema.extend({
    landlordClientId: z.string().trim().uuid("Select a valid landlord client."),
  });

export type SaveManagerOrganizationPaystackAccountInput = z.infer<
  typeof saveManagerOrganizationPaystackAccountSchema
>;

export type SaveManagerLandlordPaystackAccountInput = z.infer<
  typeof saveManagerLandlordPaystackAccountSchema
>;
