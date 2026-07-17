import { z } from "zod";

export const developerPaymentPlanModeSchema = z.enum([
  "outright",
  "fixed_installment",
  "milestone_based",
  "flexible",
]);

export const createDeveloperSaleSchema = z.object({
  plotAssignmentId: z.string().uuid("Reserved assignment is invalid."),
  paymentPlanMode: developerPaymentPlanModeSchema,
  totalPriceLocked: z.coerce
    .number()
    .positive("Sale price must be greater than zero.")
    .max(999_999_999_999, "Sale price is too high."),
  initialDepositAmount: z.coerce
    .number()
    .min(0, "Initial deposit cannot be negative.")
    .max(999_999_999_999, "Initial deposit is too high.")
    .default(0),
  saleDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid sale date."),
  expectedCompletionDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine(
      (value) => value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Enter a valid expected completion date.",
    ),
  notes: z
    .string()
    .trim()
    .max(600, "Notes are too long.")
    .optional()
    .transform((value) => value || ""),
});

export type CreateDeveloperSaleInput = z.infer<
  typeof createDeveloperSaleSchema
>;
