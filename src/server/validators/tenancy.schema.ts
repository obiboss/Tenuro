import { z } from "zod";
import {
  calculateTenancyEndDate,
  type TenancyPaymentFrequency,
} from "@/lib/tenancy-period";
import { computeRenewalNoticeDate } from "@/lib/reminder-interval";
import {
  dateStringSchema,
  moneySchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

export const reminderIntervalDaysSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 30 || value === 60 || value === 90, {
    message: "Select a renewal reminder interval.",
  });

export const createTenancySchema = z
  .object({
    tenantId: uuidSchema,
    unitId: uuidSchema,
    rentAmount: positiveMoneySchema,
    paymentFrequency: z
      .enum(["annual", "monthly", "quarterly", "biannual"], {
        message: "Select the rent payment frequency.",
      })
      .default("annual"),
    startDate: dateStringSchema,
    reminderIntervalDays: reminderIntervalDaysSchema.default(90),
    openingBalance: moneySchema.default(0),
    openingBalanceNote: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal("")),
    agreementNotes: z.string().trim().max(2000).optional().or(z.literal("")),
    currencyCode: z.string().length(3).default("NGN"),
  })
  .transform((value, context) => {
    try {
      const endDate = calculateTenancyEndDate(
        value.startDate,
        value.paymentFrequency as TenancyPaymentFrequency,
      );

      const renewalNoticeDate = computeRenewalNoticeDate(
        endDate,
        value.reminderIntervalDays,
      );

      return {
        ...value,
        endDate,
        renewalNoticeDate,
      };
    } catch {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Enter a valid start date.",
      });

      return z.NEVER;
    }
  });

export const confirmTenancyChargesSchema = z.object({
  tenancyId: uuidSchema,
});

export const renewTenancySchema = z.object({
  tenancyId: uuidSchema,
});

export const terminateTenancySchema = z.object({
  tenancyId: uuidSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export type CreateTenancyInput = z.infer<typeof createTenancySchema>;
export type ConfirmTenancyChargesInput = z.infer<
  typeof confirmTenancyChargesSchema
>;
export type RenewTenancyInput = z.infer<typeof renewTenancySchema>;
export type TerminateTenancyInput = z.infer<typeof terminateTenancySchema>;
