import { z } from "zod";

export const developerPaymentPlanModeSchema = z.enum([
  "outright",
  "fixed_installment",
  "milestone_based",
  "flexible",
]);

export const developerPaymentScheduleItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Schedule label is required.")
    .max(120, "Schedule label is too long."),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid due date."),
  expectedAmount: z.coerce
    .number()
    .positive("Expected amount must be greater than zero.")
    .max(999_999_999_999, "Expected amount is too high."),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const createDeveloperPaymentPlanSchema = z.object({
  saleId: z.string().uuid("Sale is invalid."),
  paymentPlanMode: developerPaymentPlanModeSchema,
  scheduleStartDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid schedule start date."),
  notes: z
    .string()
    .trim()
    .max(600, "Notes are too long.")
    .optional()
    .transform((value) => value || ""),
  scheduleItemsJson: z
    .string()
    .trim()
    .min(2, "Payment schedule is required.")
    .transform((value, context) => {
      try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Payment schedule must be a list.",
          });

          return z.NEVER;
        }

        return parsed;
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payment schedule is invalid.",
        });

        return z.NEVER;
      }
    })
    .pipe(z.array(developerPaymentScheduleItemSchema).min(1)),
});

export type DeveloperPaymentPlanMode = z.infer<
  typeof developerPaymentPlanModeSchema
>;

export type DeveloperPaymentScheduleItemInput = z.infer<
  typeof developerPaymentScheduleItemSchema
>;

export type CreateDeveloperPaymentPlanInput = z.infer<
  typeof createDeveloperPaymentPlanSchema
>;
