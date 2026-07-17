import { z } from "zod";
import {
  passwordSchema,
  phoneNumberSchema,
} from "@/server/validators/auth.schema";

export const developerLoginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
});

export const registerDeveloperSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long."),
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
  companyName: z
    .string()
    .trim()
    .min(2, "Enter the developer company name.")
    .max(160, "Company name is too long."),
  companyEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine(
      (value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid company email address.",
    ),
  rcNumber: z
    .string()
    .trim()
    .max(40, "RC number is too long.")
    .optional()
    .transform((value) => value || ""),
  officeAddress: z
    .string()
    .trim()
    .max(240, "Office address is too long.")
    .optional()
    .transform((value) => value || ""),
});

export type DeveloperLoginInput = z.infer<typeof developerLoginSchema>;
export type RegisterDeveloperInput = z.infer<typeof registerDeveloperSchema>;
