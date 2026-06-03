import { z } from "zod";
import {
  dateStringSchema,
  optionalEmailSchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

export const createExistingTenantClaimSchema = z.object({
  unitId: uuidSchema,
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitExistingTenantClaimSchema = z.object({
  token: z.string().trim().min(20, "Invalid claim link."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phoneNumber: z.string().trim().min(7, "Enter your phone number.").max(30),
  email: optionalEmailSchema,
  moveInDate: dateStringSchema,
  claimedRentAmount: positiveMoneySchema,
  claimedNextRentDueDate: dateStringSchema,
  paymentFrequency: z
    .enum(["annual", "monthly", "quarterly", "biannual"], {
      message: "Select your rent payment frequency.",
    })
    .default("annual"),
  tenantNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const rejectExistingTenantClaimSchema = z.object({
  claimId: uuidSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export type CreateExistingTenantClaimInput = z.infer<
  typeof createExistingTenantClaimSchema
>;

export type SubmitExistingTenantClaimInput = z.infer<
  typeof submitExistingTenantClaimSchema
>;

export type RejectExistingTenantClaimInput = z.infer<
  typeof rejectExistingTenantClaimSchema
>;
