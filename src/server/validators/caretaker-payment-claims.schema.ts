import { z } from "zod";

const uuidSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().uuid("Invalid record selected."),
);

const tokenSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().min(20, "Invalid proof link."),
);

const paymentMethodSchema = z.enum(["bank_transfer", "cash", "other"]);

const amountSchema = z.preprocess(
  (value) => {
    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "string") {
      return value.trim();
    }

    return "";
  },
  z
    .string()
    .min(1, "Enter the amount paid.")
    .refine((value) => Number.isFinite(Number(value)), {
      message: "Enter a valid amount.",
    })
    .transform((value) => Number(value))
    .refine((value) => value > 0, {
      message: "Amount paid must be greater than zero.",
    }),
);

const paymentDateSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .string()
    .min(1, "Enter the payment date.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid payment date.",
    })
    .transform((value) => new Date(value)),
);

function optionalText(maxLength: number, message: string) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(maxLength, message).optional());
}

export const createCaretakerProofRequestSchema = z.object({
  tenancyId: uuidSchema,
});

export type CreateCaretakerProofRequestInput = z.infer<
  typeof createCaretakerProofRequestSchema
>;

export const submitTenantPaymentProofSchema = z.object({
  token: tokenSchema,
  amountPaid: amountSchema,
  paymentDate: paymentDateSchema,
  paymentMethod: paymentMethodSchema,
  paymentReference: optionalText(120, "Payment reference is too long."),
  notes: optionalText(500, "Note is too long."),
});

export type SubmitTenantPaymentProofInput = z.infer<
  typeof submitTenantPaymentProofSchema
>;

export const reportCaretakerPaymentSchema = z.object({
  tenancyId: uuidSchema,
  amountPaid: amountSchema,
  paymentDate: paymentDateSchema,
  paymentMethod: paymentMethodSchema,
  paymentReference: optionalText(120, "Payment reference is too long."),
  notes: optionalText(500, "Note is too long."),
});

export type ReportCaretakerPaymentInput = z.infer<
  typeof reportCaretakerPaymentSchema
>;

export const confirmCaretakerPaymentClaimSchema = z.object({
  claimId: uuidSchema,
});

export type ConfirmCaretakerPaymentClaimInput = z.infer<
  typeof confirmCaretakerPaymentClaimSchema
>;

export const rejectCaretakerPaymentClaimSchema = z.object({
  claimId: uuidSchema,
  rejectionReason: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .string()
      .min(3, "Enter a short rejection reason.")
      .max(500, "Rejection reason is too long."),
  ),
});

export type RejectCaretakerPaymentClaimInput = z.infer<
  typeof rejectCaretakerPaymentClaimSchema
>;
