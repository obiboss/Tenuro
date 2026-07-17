import { z } from "zod";

function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function moneyValue(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();

    return normalized.length > 0 ? normalized : undefined;
  }

  return value;
}

const optionalEmailSchema = z.preprocess(
  blankToUndefined,
  z.string().trim().toLowerCase().email("Enter a valid email address.").max(254).optional(),
);

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, message).optional(),
  );

export const managerTenantGuarantorIdTypeSchema = z.enum([
  "nin",
  "passport",
  "drivers_license",
  "voters_card",
]);

export const managerTenantGuarantorInputSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the guarantor name.").max(180),
  phoneNumber: z.string().trim().min(7, "Enter the guarantor phone number.").max(30),
  email: optionalEmailSchema,
  relationshipToTenant: z.string().trim().min(2, "Enter the relationship to the tenant.").max(120),
  residentialAddress: z.string().trim().min(5, "Enter the guarantor residential address.").max(500),
  occupation: z.string().trim().min(2, "Enter the guarantor occupation.").max(160),
  employerOrBusiness: optionalTextSchema(200, "Employer or business name is too long."),
  monthlyIncome: z.preprocess(
    moneyValue,
    z.coerce.number().finite("Enter a valid monthly income.").nonnegative("Monthly income cannot be negative."),
  ),
  idType: managerTenantGuarantorIdTypeSchema,
  idNumber: z.string().trim().min(3, "Enter the guarantor ID number.").max(120),
});

export const confirmManagerTenantGuarantorSchema =
  managerTenantGuarantorInputSchema.extend({
    token: z.string().trim().min(20, "Invalid guarantor link."),
    responsibilityAcknowledgement: z
      .string()
      .refine(
        (value) => value === "on",
        "Confirm that you accept the guarantor responsibility.",
      ),
  });

export const resendManagerTenantGuarantorLinkSchema = z.object({
  guarantorId: z.string().trim().uuid("Invalid guarantor selected."),
});

export type ManagerTenantGuarantorInput = z.infer<
  typeof managerTenantGuarantorInputSchema
>;

export type ConfirmManagerTenantGuarantorInput = z.infer<
  typeof confirmManagerTenantGuarantorSchema
>;

export type ResendManagerTenantGuarantorLinkInput = z.infer<
  typeof resendManagerTenantGuarantorLinkSchema
>;
