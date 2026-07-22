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

export const existingTenantRentCyclePaymentSchema =
  existingTenantPaymentHistoryItemSchema;

export const existingTenantRentCycleSchema = z.object({
  periodStart: dateStringSchema,
  periodEnd: dateStringSchema,
  rentCharged: moneySchema,
  assumedPaid: z.boolean(),
  payments: z.array(existingTenantRentCyclePaymentSchema).max(24),
});

export const createExistingTenantClaimSchema = z.object({
  unitId: uuidSchema,
  fullName: z.string().trim().min(2, "Enter the tenant name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const createManualExistingTenantSchema = z
  .object({
    unitId: uuidSchema,
    fullName: z.string().trim().min(2, "Enter the tenant name.").max(120),
    phoneNumber: phoneSchema,
    occupation: z
      .string()
      .trim()
      .min(2, "Enter the tenant occupation.")
      .max(120),
    tenancyStartDate: dateStringSchema,
    paymentFrequency: z.enum(["annual", "monthly", "quarterly", "biannual"]).optional(),
    lastPaymentAmount: positiveMoneySchema,
    lastPaymentDate: dateStringSchema,
  })
  .superRefine((value, context) => {
    if (value.lastPaymentDate < value.tenancyStartDate) {
      context.addIssue({
        code: "custom",
        path: ["lastPaymentDate"],
        message: "The last payment cannot be before the tenancy started.",
      });
    }
  });

export const submitExistingTenantClaimSchema = z.object({
  token: z.string().trim().min(20, "Invalid claim link."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  idType: existingTenantClaimIdTypeSchema,
  idNumber: z.string().trim().min(3, "Enter your ID number.").max(120),
  moveInDate: dateStringSchema,
  statedRentDueDate: dateStringSchema.optional(),
  claimedRentAmount: positiveMoneySchema.optional(),
  paymentFrequency: z.enum(["annual", "monthly", "quarterly", "biannual"]).optional(),
  tenantNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateExistingTenantClaimArrearsSchema = z.object({
  claimId: uuidSchema,
  cycles: z
    .array(existingTenantRentCycleSchema)
    .min(1, "Rent history could not be built for this tenancy."),
});

export const approveExistingTenantClaimSchema = z.object({
  claimId: uuidSchema,
  confirmedMoveInDate: dateStringSchema,
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

export type ExistingTenantRentCycleInput = z.infer<
  typeof existingTenantRentCycleSchema
>;

export type CreateExistingTenantClaimInput = z.infer<
  typeof createExistingTenantClaimSchema
>;

export type CreateManualExistingTenantInput = z.infer<
  typeof createManualExistingTenantSchema
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
