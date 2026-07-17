import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

const uuidSchema = z.string().trim().uuid("Invalid tenant selected.");

const optionalDateSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
);

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(max, message).optional(),
  );

export const createManagerPaystackPaymentRequestSchema = z
  .object({
    tenantId: uuidSchema,
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
    notes: optionalTextSchema(600, "Notes are too long."),
  })
  .refine(
    (value) => {
      if (!value.periodStart || !value.periodEnd) {
        return true;
      }

      return value.periodEnd >= value.periodStart;
    },
    {
      path: ["periodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

export type CreateManagerPaystackPaymentRequestInput = z.infer<
  typeof createManagerPaystackPaymentRequestSchema
>;
