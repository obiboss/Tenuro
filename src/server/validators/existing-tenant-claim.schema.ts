import { z } from "zod";
import {
  dateStringSchema,
  moneySchema,
  optionalEmailSchema,
  phoneSchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

export const existingTenantClaimIdTypeSchema = z.enum([
  "nin",
  "passport",
  "drivers_license",
  "voters_card",
]);

export const existingTenantPaymentHistoryItemSchema = z.object({
  amount: positiveMoneySchema,
  paidAt: dateStringSchema,
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const createExistingTenantClaimSchema = z.object({
  unitId: uuidSchema,
  fullName: z.string().trim().min(2, "Enter the tenant name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitExistingTenantClaimSchema = z.object({
  token: z.string().trim().min(20, "Invalid claim link."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  occupation: z.string().trim().min(2, "Enter your occupation.").max(120),
  idType: existingTenantClaimIdTypeSchema,
  idNumber: z.string().trim().min(3, "Enter your ID number.").max(120),
  moveInDate: dateStringSchema,
  claimedRentAmount: positiveMoneySchema,
  paymentFrequency: z
    .enum(["annual", "monthly", "quarterly", "biannual"], {
      message: "Select your rent payment frequency.",
    })
    .default("annual"),
  tenantNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateExistingTenantClaimArrearsSchema = z.object({
  claimId: uuidSchema,
  paymentHistory: z
    .array(existingTenantPaymentHistoryItemSchema)
    .min(1, "Enter at least one payment record.")
    .max(12, "You can enter up to 12 payment records at once."),
});

export const approveExistingTenantClaimSchema = z.object({
  claimId: uuidSchema,
  confirmedRentAmount: positiveMoneySchema,
  confirmedMoveInDate: dateStringSchema,
  confirmedCurrentDueDate: dateStringSchema,
  openingBalance: moneySchema.default(0),
  reviewNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const rejectExistingTenantClaimSchema = z.object({
  claimId: uuidSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export type ExistingTenantPaymentHistoryItem = z.infer<
  typeof existingTenantPaymentHistoryItemSchema
>;

export type CreateExistingTenantClaimInput = z.infer<
  typeof createExistingTenantClaimSchema
>;

export type SubmitExistingTenantClaimInput = z.infer<
  typeof submitExistingTenantClaimSchema
>;

export type UpdateExistingTenantClaimArrearsInput = z.infer<
  typeof updateExistingTenantClaimArrearsSchema
>;

export type ApproveExistingTenantClaimInput = z.infer<
  typeof approveExistingTenantClaimSchema
>;

export type RejectExistingTenantClaimInput = z.infer<
  typeof rejectExistingTenantClaimSchema
>;
