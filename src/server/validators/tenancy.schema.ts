import { z } from "zod";
import {
  dateStringSchema,
  moneySchema,
  positiveMoneySchema,
  uuidSchema,
} from "./common.schema";

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
    endDate: dateStringSchema,
    renewalNoticeDate: dateStringSchema.optional().or(z.literal("")),
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
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    path: ["endDate"],
    message: "End date must be after start date.",
  });

export const terminateTenancySchema = z.object({
  tenancyId: uuidSchema,
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export type CreateTenancyInput = z.infer<typeof createTenancySchema>;
export type TerminateTenancyInput = z.infer<typeof terminateTenancySchema>;
