import { z } from "zod";
import { positiveMoneySchema, uuidSchema } from "./common.schema";

export const landlordChargeTypeSchema = z.enum([
  "agreement_fee",
  "caution_deposit",
  "damages_deposit",
  "service_charge",
  "legal_fee",
  "documentation_fee",
  "other",
]);

export const createLandlordTenancyChargeSchema = z.object({
  tenancyId: uuidSchema,
  chargeType: landlordChargeTypeSchema,
  label: z
    .string()
    .trim()
    .min(2, "Enter the charge label.")
    .max(120, "Charge label is too long."),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: positiveMoneySchema,
  currencyCode: z.string().trim().length(3).default("NGN"),
  isRefundable: z.coerce.boolean().default(false),
  isRequiredBeforeMoveIn: z.coerce.boolean().default(true),
});

export const updateLandlordTenancyChargeSchema =
  createLandlordTenancyChargeSchema.extend({
    chargeId: uuidSchema,
  });

export const archiveLandlordTenancyChargeSchema = z.object({
  chargeId: uuidSchema,
  tenancyId: uuidSchema,
});

export type CreateLandlordTenancyChargeInput = z.infer<
  typeof createLandlordTenancyChargeSchema
>;

export type UpdateLandlordTenancyChargeInput = z.infer<
  typeof updateLandlordTenancyChargeSchema
>;

export type ArchiveLandlordTenancyChargeInput = z.infer<
  typeof archiveLandlordTenancyChargeSchema
>;
