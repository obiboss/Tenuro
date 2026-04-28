import { z } from "zod";
import { uuidSchema } from "./common.schema";

export const landlordComplianceStatusSchema = z.enum([
  "active",
  "warned",
  "grace_period",
  "restricted",
  "suspended",
]);

export const restrictedFeatureSchema = z.enum([
  "send_reminders",
  "generate_receipts",
  "onboard_tenants",
  "access_renewal_queue",
  "view_financial_reports",
  "create_tenancies",
]);

export const updateLandlordComplianceSchema = z.object({
  landlordId: uuidSchema,
  status: landlordComplianceStatusSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(1000),
});

export const featureGateCheckSchema = z.object({
  landlordId: uuidSchema,
  feature: restrictedFeatureSchema,
});

export type LandlordComplianceStatusInput = z.infer<
  typeof landlordComplianceStatusSchema
>;
export type RestrictedFeatureInput = z.infer<typeof restrictedFeatureSchema>;
export type UpdateLandlordComplianceInput = z.infer<
  typeof updateLandlordComplianceSchema
>;
export type FeatureGateCheckInput = z.infer<typeof featureGateCheckSchema>;
