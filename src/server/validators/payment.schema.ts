import { z } from "zod";
import {
  dateStringSchema,
  idempotencyKeySchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

export const initializeRentPaymentSchema = z.object({
  tenancyId: uuidSchema,
  amount: positiveMoneySchema,
  periodStart: dateStringSchema.optional(),
  periodEnd: dateStringSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const initializeAppFeePaymentSchema = z.object({
  rentPaymentId: uuidSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const recordManualPaymentSchema = z.object({
  tenancyId: uuidSchema,
  amountPaid: positiveMoneySchema,
  paymentMethod: z.enum(["bank_transfer", "cash", "other"]),
  paymentReference: z
    .string()
    .trim()
    .min(2, "Enter the payment reference.")
    .max(120)
    .optional()
    .or(z.literal("")),
  paymentDate: z.coerce.date(),
  paymentForPeriodStart: z.coerce.date().optional(),
  paymentForPeriodEnd: z.coerce.date().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
  idempotencyKey: idempotencyKeySchema,
});

export const reversePaymentSchema = z.object({
  paymentId: uuidSchema,
  reason: z.string().trim().min(5, "Enter the reason.").max(500),
});

export const setupLandlordBankAccountSchema = z.object({
  bankCode: z.string().trim().min(2, "Select the bank."),
  bankName: z.string().trim().min(2, "Select the bank."),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a valid 10-digit account number."),
  businessName: z.string().trim().min(2, "Enter the business name.").max(120),
});

export const paystackWebhookDataSchema = z
  .object({
    reference: z.string().min(1),
    status: z.string().min(1).optional(),
  })
  .passthrough();

export const paystackWebhookSchema = z.object({
  event: z.enum([
    "charge.success",
    "charge.failed",
    "transfer.failed",
    "refund.processed",
  ]),
  data: paystackWebhookDataSchema,
});

export const paystackMetadataSchema = z.object({
  tenancy_id: uuidSchema,
  tenant_id: uuidSchema,
  landlord_id: uuidSchema,
  expected_amount_naira: positiveMoneySchema,
  currency_code: z.string().length(3).default("NGN"),
  period_start: dateStringSchema.optional(),
  period_end: dateStringSchema.optional(),
});

export type InitializeRentPaymentInput = z.infer<
  typeof initializeRentPaymentSchema
>;

export type InitializeAppFeePaymentInput = z.infer<
  typeof initializeAppFeePaymentSchema
>;

export type RecordManualPaymentInput = z.infer<
  typeof recordManualPaymentSchema
>;

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export type SetupLandlordBankAccountInput = z.infer<
  typeof setupLandlordBankAccountSchema
>;

export type PaystackWebhookInput = z.infer<typeof paystackWebhookSchema>;

export type PaystackMetadataInput = z.infer<typeof paystackMetadataSchema>;
