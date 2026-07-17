import { z } from "zod";

export const createDeveloperPaymentRequestSchema = z.object({
  saleId: z.string().uuid("Sale is invalid."),
  scheduleItemId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
  amount: z.coerce
    .number()
    .positive("Payment amount must be greater than zero.")
    .max(999_999_999_999, "Payment amount is too high."),
  buyerEmail: z
    .string()
    .trim()
    .email("Enter a valid buyer email address.")
    .optional()
    .transform((value) => value || ""),
});

export type CreateDeveloperPaymentRequestInput = z.infer<
  typeof createDeveloperPaymentRequestSchema
>;
