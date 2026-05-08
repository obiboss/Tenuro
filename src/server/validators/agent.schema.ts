import { z } from "zod";
import { phoneNumberSchema } from "@/server/validators/auth.schema";

export const setupAgentProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter the agency or business name.")
    .max(120, "Business name is too long."),
  businessPhone: phoneNumberSchema,
  serviceState: z
    .string()
    .trim()
    .min(2, "Enter the state where this agent operates.")
    .max(80, "State name is too long."),
  serviceLga: z
    .string()
    .trim()
    .min(2, "Enter the LGA where this agent operates.")
    .max(120, "LGA name is too long."),
  businessAddress: z.string().trim().max(300).optional().or(z.literal("")),
});

export const setupAgentBankAccountSchema = z.object({
  bankCode: z.string().trim().min(2, "Select the bank."),
  bankName: z.string().trim().min(2, "Select the bank."),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a valid 10-digit account number."),
  businessName: z.string().trim().min(2, "Enter the business name.").max(120),
});

export type SetupAgentProfileInput = z.infer<typeof setupAgentProfileSchema>;

export type SetupAgentBankAccountInput = z.infer<
  typeof setupAgentBankAccountSchema
>;
