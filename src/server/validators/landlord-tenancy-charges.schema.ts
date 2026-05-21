import { z } from "zod";
import { positiveMoneySchema, uuidSchema } from "./common.schema";

export const createLandlordTenancyChargeSchema = z.object({
  tenancyId: uuidSchema,
  chargeName: z
    .string()
    .trim()
    .min(2, "Enter the charge name.")
    .max(120, "Charge name is too long."),
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
